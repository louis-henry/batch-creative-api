import { describe, it, expect } from 'vitest';
import { formatSpec } from '@app/contracts';
import { processItem, type ProcessItemDeps } from './processItem.js';
import { ProviderError } from '../resilience/errors.js';
import type { RetryPolicy } from '../resilience/policy.js';
import type { ImageProvider } from '../ports/imageProvider.js';
import type { TextProvider } from '../ports/textProvider.js';
import type { Compositor } from '../ports/compositor.js';
import type { ImageStore } from '../ports/imageStore.js';
import { buildStyleSpec } from '../../domain/style/styleSpec.js';

const style = buildStyleSpec({ descriptor: 'd' });
const product = (id: string): { id: string; product: Buffer; refs: Buffer[] } => ({
  id,
  product: Buffer.from('P'),
  refs: [],
});
const policy: RetryPolicy = { maxRetries: 1, baseMs: 1, maxMs: 5, attemptTimeoutMs: 50 };

const image = (name: string, generate: ImageProvider['generate']): ImageProvider => ({
  name,
  generate,
});

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

const deps = (over: Partial<ProcessItemDeps> = {}): ProcessItemDeps => ({
  imageProviders: [image('gemini', () => Promise.resolve(Buffer.from('IMG')))],
  text: text(),
  compositor,
  store,
  policy,
  ...over,
});

describe('processItem', () => {
  it('produces the three posts, the copy, and the winning provider', async () => {
    const result = await processItem(product('a'), style, deps());
    expect(result.posts.map((p) => p.format).sort()).toEqual(['banner', 'square', 'story']);
    expect(result.providerUsed).toBe('gemini');
    expect(result.copy).toEqual({ headline: 'H', subtext: 'S', cta: 'C' });

    const square = result.posts.find((p) => p.format === 'square');
    expect(square?.url).toBe('https://x/a-square'); // key is `${id}-${format}`
    expect(square?.width).toBe(formatSpec('square').width);
    expect(square?.height).toBe(formatSpec('square').height);
  });

  it('passes the judge gate on the primary provider when the score is high', async () => {
    const result = await processItem(
      product('a'),
      style,
      deps({ text: text({ judge: () => Promise.resolve({ score: 0.9 }) }), judgeThreshold: 0.5 }),
    );
    expect(result.providerUsed).toBe('gemini');
  });

  it('does not discard a good image when the judge call itself fails', async () => {
    const result = await processItem(
      product('a'),
      style,
      deps({
        text: text({
          judge: () => Promise.reject(new ProviderError('judge down', { retryable: true })),
        }),
        judgeThreshold: 0.5,
      }),
    );
    expect(result.providerUsed).toBe('gemini');
  });

  it('fails over to the second image provider', async () => {
    const result = await processItem(
      product('a'),
      style,
      deps({
        imageProviders: [
          image('gemini', () => Promise.reject(new ProviderError('down', { retryable: true }))),
          image('openai', () => Promise.resolve(Buffer.from('IMG2'))),
        ],
      }),
    );
    expect(result.providerUsed).toBe('openai');
  });

  it('chaos disables the primary provider, forcing failover', async () => {
    const result = await processItem(
      product('a'),
      style,
      deps({
        imageProviders: [
          image('gemini', () => Promise.resolve(Buffer.from('IMG'))),
          image('openai', () => Promise.resolve(Buffer.from('IMG2'))),
        ],
        chaos: true,
      }),
    );
    expect(result.providerUsed).toBe('openai');
  });

  it('fails over when the judge scores the image below the threshold', async () => {
    const judging = text({
      judge: ({ image: img }) =>
        Promise.resolve({ score: img.equals(Buffer.from('GOOD')) ? 0.9 : 0.2 }),
    });
    const result = await processItem(
      product('a'),
      style,
      deps({
        text: judging,
        judgeThreshold: 0.5,
        imageProviders: [
          image('gemini', () => Promise.resolve(Buffer.from('BAD'))),
          image('openai', () => Promise.resolve(Buffer.from('GOOD'))),
        ],
      }),
    );
    expect(result.providerUsed).toBe('openai');
  });
});
