import { describe, it, expect } from 'vitest';
import { createApp } from './app.js';
import { runBatch } from '../../application/batch/runBatch.js';
import { createInMemoryJobStore } from '../../adapters/jobs/inMemoryJobStore.js';
import type { ImageProvider } from '../../application/ports/imageProvider.js';
import type { TextProvider } from '../../application/ports/textProvider.js';
import type { Compositor } from '../../application/ports/compositor.js';
import type { ImageStore } from '../../application/ports/imageStore.js';

const image: ImageProvider = {
  name: 'gemini',
  generate: () => Promise.resolve(Buffer.from('IMG')),
};
const text: TextProvider = {
  name: 'openrouter',
  describeStyle: () => Promise.resolve({ descriptor: 'd', palette: [] }),
  copy: () => Promise.resolve({ headline: 'H', subtext: '', cta: 'C' }),
  judge: () => Promise.resolve({ score: 1 }),
};
const compositor: Compositor = {
  render: () =>
    Promise.resolve({
      square: Buffer.from('s'),
      story: Buffer.from('t'),
      banner: Buffer.from('b'),
    }),
};
const store: ImageStore = { save: (key) => Promise.resolve({ key, url: `https://x/${key}` }) };
const png = (name: string): File => new File([new Uint8Array(3)], name, { type: 'image/png' });

interface JobSnapshot {
  status: string;
  succeeded: { id: string; posts: unknown[] }[];
  failed: { id: string }[];
}

describe('batch flow: HTTP request → runBatch → polled result', () => {
  it('runs a posted batch end to end and exposes item-N results', async () => {
    const jobStore = createInMemoryJobStore();
    const app = createApp({
      jobStore,
      startBatch: (jobId, products, refs, options) => {
        runBatch(jobId, products, refs, {
          imageProviders: [image],
          text,
          compositor,
          store,
          jobStore,
          policy: { maxRetries: 0, baseMs: 1, maxMs: 5, attemptTimeoutMs: 100 },
          concurrency: 2,
          chaos: options.chaos,
        }).catch(() => undefined);
      },
    });

    const form = new FormData();
    form.append('products', png('a.png'));
    form.append('products', png('b.png'));
    form.append('refs', png('r.png'));
    const res = await app.request('/batch', { method: 'POST', body: form });
    expect(res.status).toBe(202);
    const { jobId } = (await res.json()) as { jobId: string };

    let job: JobSnapshot | undefined;
    for (let i = 0; i < 50 && job?.status !== 'done'; i++) {
      const polled = await app.request(`/batch/${jobId}`);
      job = (await polled.json()) as JobSnapshot;
      if (job.status !== 'done') await new Promise((r) => setTimeout(r, 5));
    }

    expect(job?.status).toBe('done');
    expect(job?.succeeded.map((s) => s.id).sort()).toEqual(['item-0', 'item-1']);
    expect(job?.succeeded[0]?.posts).toHaveLength(3);
    expect(job?.failed).toHaveLength(0);
  });
});
