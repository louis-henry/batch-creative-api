import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
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

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();

  app.post('/batch', async (c) => {
    const form = await c.req.formData();
    const products = await readFiles(form.getAll('products'));
    const refs = await readFiles(form.getAll('refs'));

    const problem = validate(products, refs);
    if (problem) return c.json({ error: problem }, 400);

    const options = batchOptionsSchema.parse({
      concurrency: numberField(form.get('concurrency')),
      chaos: form.get('chaos') === 'true',
    });

    const jobId = randomUUID();
    deps.jobStore.create(jobId);
    deps.startBatch(
      jobId,
      products.map((product, i) => ({ id: `item-${i}`, product, refs })),
      refs,
      options,
    );
    return c.json({ jobId }, 202);
  });

  app.get('/batch/:id', (c) => {
    const job = deps.jobStore.get(c.req.param('id'));
    return job ? c.json(job) : c.json({ error: 'job not found' }, 404);
  });

  return app;
}

async function readFiles(entries: (File | string)[]): Promise<Buffer[]> {
  const files = entries.filter((e): e is File => e instanceof File);
  return Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer())));
}

function validate(products: Buffer[], refs: Buffer[]): string | undefined {
  if (products.length === 0) return 'at least one product image is required';
  if (products.length > MAX_PRODUCTS) return `at most ${MAX_PRODUCTS} product images allowed`;
  if (refs.length < 1 || refs.length > 2) return 'provide 1 or 2 reference images';
  if ([...products, ...refs].some((b) => b.byteLength > MAX_BYTES)) return 'an image exceeds 10MB';
  return undefined;
}

function numberField(value: File | string | null): number | undefined {
  return typeof value === 'string' && value.length > 0 ? Number(value) : undefined;
}
