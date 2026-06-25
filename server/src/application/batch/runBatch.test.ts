import { describe, it, expect } from 'vitest';
import { runBatch, type RunBatchDeps } from './runBatch.js';
import { ProviderError } from '../resilience/errors.js';
import type { ImageProvider } from '../ports/imageProvider.js';
import type { TextProvider } from '../ports/textProvider.js';
import type { Compositor } from '../ports/compositor.js';
import type { ImageStore } from '../ports/imageStore.js';
import { createInMemoryJobStore } from '../../adapters/jobs/inMemoryJobStore.js';

const text = (over: Partial<TextProvider> = {}): TextProvider => ({
  name: 'openrouter',
  describeStyle: () => Promise.resolve({ descriptor: 'd', palette: [] }),
  copy: () => Promise.resolve({ headline: 'H', subtext: 'S', cta: 'C' }),
  judge: () => Promise.resolve({ score: 1 }),
  ...over,
});
const compositor: Compositor = {
  render: () =>
    Promise.resolve({
      square: Buffer.from('sq'),
      story: Buffer.from('st'),
      banner: Buffer.from('bn'),
    }),
};
const store: ImageStore = { save: (key) => Promise.resolve({ key, url: `https://x/${key}` }) };

// Image generation fails for any product whose bytes are 'BAD'.
const flakyImage: ImageProvider = {
  name: 'gemini',
  generate: ({ product }) =>
    product.equals(Buffer.from('BAD'))
      ? Promise.reject(new ProviderError('bad product', { retryable: false }))
      : Promise.resolve(Buffer.from('IMG')),
};

const deps = (
  jobStore: ReturnType<typeof createInMemoryJobStore>,
  over: Partial<RunBatchDeps> = {},
): RunBatchDeps => ({
  imageProviders: [flakyImage],
  text: text(),
  compositor,
  store,
  policy: { maxRetries: 0, baseMs: 1, maxMs: 5, attemptTimeoutMs: 50 },
  jobStore,
  concurrency: 2,
  ...over,
});

const products = [
  { id: 'a', product: Buffer.from('OK'), refs: [] },
  { id: 'b', product: Buffer.from('BAD'), refs: [] },
];

describe('runBatch', () => {
  it('reports partial success and finishes done', async () => {
    const jobStore = createInMemoryJobStore();
    jobStore.create('j');
    await runBatch('j', products, [Buffer.from('R')], deps(jobStore));

    const job = jobStore.get('j');
    expect(job?.status).toBe('done');
    expect(job?.succeeded.map((s) => s.id)).toEqual(['a']);
    expect(job?.failed.map((f) => f.id)).toEqual(['b']);
  });

  it('fails every item when the style read fails', async () => {
    const jobStore = createInMemoryJobStore();
    jobStore.create('j');
    const failingStyle = deps(jobStore, {
      text: text({
        describeStyle: () => Promise.reject(new ProviderError('no vision', { retryable: false })),
      }),
    });

    await runBatch('j', products, [Buffer.from('R')], failingStyle);

    const job = jobStore.get('j');
    expect(job?.status).toBe('done');
    expect(job?.succeeded).toHaveLength(0);
    expect(job?.failed.map((f) => f.id).sort()).toEqual(['a', 'b']);
  });
});
