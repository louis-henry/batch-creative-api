import { randomUUID } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { batchOptionsSchema } from '@app/contracts';
import type { JobStore } from '../../application/ports/jobStore.js';
import type { ProductInput } from '../../application/batch/processItem.js';
import { createRateGuard, type RateLimit, type RateGuard } from './rateGuard.js';

export type StartBatch = (
  jobId: string,
  products: ProductInput[],
  refs: Buffer[],
  options: { concurrency: number; chaos: boolean },
) => void;

export interface AppDeps {
  jobStore: JobStore;
  startBatch: StartBatch;
  corsOrigin?: string;
  // Cap on products per request (default 20); lower it on the public deploy to
  // bound per-request spend.
  maxProducts?: number;
  // When set, basic in-memory rate limiting guards the paid /batch endpoint.
  rateLimits?: { perIp: RateLimit; global: RateLimit };
}

const MAX_PRODUCTS = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const maxProducts = deps.maxProducts ?? MAX_PRODUCTS;
  // Body limit tracks the product cap so lowering MAX_PRODUCTS also tightens the
  // bytes buffered before validation rejects an oversized batch.
  const maxBody = (maxProducts + 2) * MAX_BYTES;
  const guard = deps.rateLimits ? createRateGuard() : undefined;
  // crossOrigin RP so the browser can load generated images from this API origin.
  app.use('*', secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }));
  app.use('*', cors(deps.corsOrigin !== undefined ? { origin: deps.corsOrigin } : undefined));

  app.get('/health', (c) => c.json({ ok: true }));

  app.post(
    '/batch',
    bodyLimit({ maxSize: maxBody, onError: (c) => c.json({ error: 'request too large' }, 413) }),
    async (c) => {
      // Basic spend guard: reject before parsing/work when the public limits are hit.
      const limited = rateLimited(c, deps.rateLimits, guard);
      if (limited) return limited;

      const form = await c.req.formData().catch(() => null);
      if (!form) return c.json({ error: 'expected multipart form data' }, 400);

      const products = fileList(form.getAll('products'));
      const refs = fileList(form.getAll('refs'));
      const problem = validate(products, refs, maxProducts);
      if (problem) return c.json({ error: problem }, 400);

      const options = batchOptionsSchema.safeParse({
        concurrency: numberField(form.get('concurrency')),
        chaos: form.get('chaos') === 'true',
      });
      if (!options.success) return c.json({ error: 'invalid batch options' }, 400);

      const [productBufs, refBufs] = await Promise.all([readBuffers(products), readBuffers(refs)]);
      const jobId = randomUUID();
      deps.jobStore.create(jobId);
      deps.startBatch(
        jobId,
        productBufs.map((product, i) => ({ id: `item-${i}`, product, refs: refBufs })),
        refBufs,
        options.data,
      );
      return c.json({ jobId }, 202);
    },
  );

  app.get('/batch/:id', (c) => {
    const job = deps.jobStore.get(c.req.param('id'));
    return job ? c.json(job) : c.json({ error: 'job not found' }, 404);
  });

  return app;
}

function fileList(entries: (File | string)[]): File[] {
  return entries.filter((e): e is File => e instanceof File);
}

// Basic spend guard for the public deploy: a global and a per-IP cap on the paid
// endpoint. Returns a 429 response when over a limit, or undefined to proceed.
function rateLimited(
  c: Context,
  limits: AppDeps['rateLimits'],
  guard: RateGuard | undefined,
): Response | undefined {
  if (!limits || !guard) return undefined;
  // Behind a single trusted proxy (Railway/Render) the client's real IP is the LAST
  // X-Forwarded-For hop; the leftmost entries are client-supplied, so per-IP is
  // best-effort. The global cap and the provider spend caps are the real bound.
  const ip = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim() || 'local';
  // Per-IP first: a request an IP is already over its own limit on must not consume
  // a global slot, or one IP could exhaust the shared cap with rejected requests.
  if (!guard.allow(`ip:${ip}`, limits.perIp))
    return c.json({ error: 'too many requests, please slow down and try again soon' }, 429);
  if (!guard.allow('global', limits.global))
    return c.json({ error: 'the demo is busy right now, please try again shortly' }, 429);
  return undefined;
}

// Validates count, mime, and size from File metadata BEFORE any bytes are read.
function validate(products: File[], refs: File[], maxProducts: number): string | undefined {
  if (products.length === 0) return 'at least one product image is required';
  if (products.length > maxProducts) return `at most ${String(maxProducts)} product images allowed`;
  if (refs.length < 1 || refs.length > 2) return 'provide 1 or 2 reference images';
  for (const file of [...products, ...refs]) {
    if (!ALLOWED_MIME.has(file.type)) return `unsupported image type: ${file.type || 'unknown'}`;
    if (file.size > MAX_BYTES) return 'an image exceeds 10MB';
  }
  return undefined;
}

function readBuffers(files: File[]): Promise<Buffer[]> {
  return Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
}

function numberField(value: File | string | null): number | undefined {
  return typeof value === 'string' && value.length > 0 ? Number(value) : undefined;
}
