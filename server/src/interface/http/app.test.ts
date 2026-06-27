import { describe, it, expect } from 'vitest';
import { createApp, type StartBatch } from './app.js';
import { createInMemoryJobStore } from '../../adapters/jobs/inMemoryJobStore.js';

const pngFile = (name: string, bytes = 3): File =>
  new File([new Uint8Array(bytes)], name, { type: 'image/png' });

const noop: StartBatch = () => undefined;
const post = (app: ReturnType<typeof createApp>, form: FormData): Promise<Response> =>
  Promise.resolve(app.request('/batch', { method: 'POST', body: form }));

const reject = (form: FormData): Promise<Response> =>
  post(createApp({ jobStore: createInMemoryJobStore(), startBatch: noop }), form);

describe('createApp POST /batch', () => {
  it('accepts a batch, creates a job, and forwards options', async () => {
    const jobStore = createInMemoryJobStore();
    let started: { jobId: string; count: number; concurrency: number; chaos: boolean } | undefined;
    const startBatch: StartBatch = (jobId, products, _refs, options) => {
      started = {
        jobId,
        count: products.length,
        concurrency: options.concurrency,
        chaos: options.chaos,
      };
    };
    const form = new FormData();
    form.append('products', pngFile('p.png'));
    form.append('refs', pngFile('r.png'));
    form.append('concurrency', '8');
    form.append('chaos', 'true');

    const res = await post(createApp({ jobStore, startBatch }), form);

    expect(res.status).toBe(202);
    const json = (await res.json()) as { jobId: string };
    expect(started?.jobId).toBe(json.jobId);
    expect(started).toMatchObject({ count: 1, concurrency: 8, chaos: true });
    expect(jobStore.get(json.jobId)?.status).toBe('pending');
  });

  it('rejects no products, no refs, too many refs, and too many products', async () => {
    const onlyRefs = new FormData();
    onlyRefs.append('refs', pngFile('r.png'));
    expect((await reject(onlyRefs)).status).toBe(400);

    const onlyProducts = new FormData();
    onlyProducts.append('products', pngFile('p.png'));
    expect((await reject(onlyProducts)).status).toBe(400);

    const threeRefs = new FormData();
    threeRefs.append('products', pngFile('p.png'));
    ['a', 'b', 'c'].forEach((n) => threeRefs.append('refs', pngFile(`${n}.png`)));
    expect((await reject(threeRefs)).status).toBe(400);

    const manyProducts = new FormData();
    manyProducts.append('refs', pngFile('r.png'));
    Array.from({ length: 21 }, (_, i) => manyProducts.append('products', pngFile(`p${i}.png`)));
    expect((await reject(manyProducts)).status).toBe(400);
  });

  it('rejects an oversized file and a non-image type', async () => {
    const big = new FormData();
    big.append('products', pngFile('p.png', 10 * 1024 * 1024 + 1));
    big.append('refs', pngFile('r.png'));
    expect((await reject(big)).status).toBe(400);

    const wrongType = new FormData();
    wrongType.append('products', new File([new Uint8Array(3)], 'p.txt', { type: 'text/plain' }));
    wrongType.append('refs', pngFile('r.png'));
    expect((await reject(wrongType)).status).toBe(400);
  });

  it('maps malformed options to 400, not 500', async () => {
    const form = new FormData();
    form.append('products', pngFile('p.png'));
    form.append('refs', pngFile('r.png'));
    form.append('concurrency', 'abc');
    expect((await reject(form)).status).toBe(400);
  });

  it('rate-limits the paid endpoint per IP when limits are configured', async () => {
    const app = createApp({
      jobStore: createInMemoryJobStore(),
      startBatch: noop,
      rateLimits: {
        perIp: { limit: 2, windowMs: 60_000 },
        global: { limit: 100, windowMs: 60_000 },
      },
    });
    const valid = (): FormData => {
      const f = new FormData();
      f.append('products', pngFile('p.png'));
      f.append('refs', pngFile('r.png'));
      return f;
    };
    const send = (): Promise<Response> =>
      Promise.resolve(
        app.request('/batch', {
          method: 'POST',
          body: valid(),
          headers: { 'x-forwarded-for': 'client-a' },
        }),
      );
    expect((await send()).status).toBe(202);
    expect((await send()).status).toBe(202);
    expect((await send()).status).toBe(429);
  });
});

describe('createApp GET /batch/:id', () => {
  it('returns the job snapshot and 404 with a body for unknown jobs', async () => {
    const jobStore = createInMemoryJobStore();
    jobStore.create('known');
    const app = createApp({ jobStore, startBatch: noop });

    const ok = await app.request('/batch/known');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({
      jobId: 'known',
      status: 'pending',
      succeeded: [],
      failed: [],
    });

    const missing = await app.request('/batch/unknown');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'job not found' });
  });
});
