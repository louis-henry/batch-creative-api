import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { batchOptionsSchema } from '@app/contracts';
import type { JobStore } from '../../application/ports/jobStore.js';
import type { ProductInput } from '../../application/batch/processItem.js';

export type StartBatch = (
  jobId: string,
  products: ProductInput[],
  refs: Buffer[],
  options: { concurrency: number; chaos: boolean },
) => void;

export interface AppDeps {
  jobStore: JobStore;
  startBatch: StartBatch;
}

const MAX_PRODUCTS = 20;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_BODY = (MAX_PRODUCTS + 2) * MAX_BYTES;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.post(
    '/batch',
    bodyLimit({ maxSize: MAX_BODY, onError: (c) => c.json({ error: 'request too large' }, 413) }),
    async (c) => {
      const form = await c.req.formData().catch(() => null);
      if (!form) return c.json({ error: 'expected multipart form data' }, 400);

      const products = fileList(form.getAll('products'));
      const refs = fileList(form.getAll('refs'));
      const problem = validate(products, refs);
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

// Validates count, mime, and size from File metadata BEFORE any bytes are read.
function validate(products: File[], refs: File[]): string | undefined {
  if (products.length === 0) return 'at least one product image is required';
  if (products.length > MAX_PRODUCTS) return `at most ${MAX_PRODUCTS} product images allowed`;
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
