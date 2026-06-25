import { describe, it, expect } from 'vitest';
import { createApp, type StartBatch } from './app.js';
import { createInMemoryJobStore } from '../../adapters/jobs/inMemoryJobStore.js';

const pngFile = (name: string): File =>
  new File([new Uint8Array(Buffer.from('IMG'))], name, { type: 'image/png' });

const noop: StartBatch = () => undefined;

describe('createApp', () => {
  it('accepts a batch, creates a job, and kicks off processing', async () => {
    const jobStore = createInMemoryJobStore();
    let started: { jobId: string; count: number; chaos: boolean } | undefined;
    const startBatch: StartBatch = (jobId, products, _refs, options) => {
      started = { jobId, count: products.length, chaos: options.chaos };
    };
    const app = createApp({ jobStore, startBatch });

    const form = new FormData();
    form.append('products', pngFile('p.png'));
    form.append('refs', pngFile('r.png'));
    form.append('chaos', 'true');
    const res = await app.request('/batch', { method: 'POST', body: form });

    expect(res.status).toBe(202);
    const json = (await res.json()) as { jobId: string };
    expect(started?.jobId).toBe(json.jobId);
    expect(started?.count).toBe(1);
    expect(started?.chaos).toBe(true);
    expect(jobStore.get(json.jobId)?.status).toBe('pending');
  });

  it('rejects a batch with no product images', async () => {
    const app = createApp({ jobStore: createInMemoryJobStore(), startBatch: noop });
    const form = new FormData();
    form.append('refs', pngFile('r.png'));
    expect((await app.request('/batch', { method: 'POST', body: form })).status).toBe(400);
  });

  it('rejects a batch with no reference images', async () => {
    const app = createApp({ jobStore: createInMemoryJobStore(), startBatch: noop });
    const form = new FormData();
    form.append('products', pngFile('p.png'));
    expect((await app.request('/batch', { method: 'POST', body: form })).status).toBe(400);
  });

  it('returns a job snapshot and 404 for unknown jobs', async () => {
    const jobStore = createInMemoryJobStore();
    jobStore.create('known');
    const app = createApp({ jobStore, startBatch: noop });
    expect((await app.request('/batch/known')).status).toBe(200);
    expect((await app.request('/batch/unknown')).status).toBe(404);
  });
});
