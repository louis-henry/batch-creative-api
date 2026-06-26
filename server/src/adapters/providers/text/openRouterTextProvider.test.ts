import { describe, it, expect } from 'vitest';
import { createOpenRouterTextProvider } from './openRouterTextProvider.js';
import type { ProviderError } from '../../../application/resilience/errors.js';
import { buildStyleSpec } from '../../../domain/style/styleSpec.js';

const style = buildStyleSpec({ descriptor: 'warm studio' });
const signal = (): AbortSignal => new AbortController().signal;

const chatBody = (content: string): string =>
  JSON.stringify({ choices: [{ message: { content } }] });

const respondWith =
  (body: string, status = 200): (() => Promise<Response>) =>
  () =>
    Promise.resolve(new Response(body, { status }));

describe('openRouterTextProvider', () => {
  it('requests a structured post with the image and returns a parsed SocialPost', async () => {
    let captured: RequestInit | undefined;
    const fetchFn = (_url: string, init: RequestInit): Promise<Response> => {
      captured = init;
      return Promise.resolve(
        new Response(
          chatBody(JSON.stringify({ title: 'Hi', caption: 'there', hashtags: ['#shop'] })),
        ),
      );
    };

    const sig = signal();
    const post = await createOpenRouterTextProvider({ apiKey: 'k', fetchFn }).writePost({
      product: Buffer.from('P'),
      style,
      signal: sig,
    });

    expect(post).toEqual({ title: 'Hi', caption: 'there', hashtags: ['#shop'] });
    expect(captured?.signal).toBe(sig);
    expect((captured?.headers as Record<string, string>).Authorization).toBe('Bearer k');
    const body = JSON.parse(String(captured?.body)) as {
      response_format: { type: string };
      messages: { content: { type: string; image_url?: { url: string } }[] }[];
    };
    expect(body.response_format.type).toBe('json_schema');
    expect(body.messages[0]?.content[1]?.image_url?.url).toContain('data:image/png;base64,');
  });

  it('treats an empty choices array as retryable (no content)', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith(JSON.stringify({ choices: [] })),
    });
    const error = await provider
      .writePost({ product: Buffer.from('P'), style, signal: signal() })
      .catch((e: unknown) => e);
    expect((error as ProviderError).retryable).toBe(true);
  });

  it('treats a non-numeric judge score as retryable', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith(chatBody(JSON.stringify({ score: 'high' }))),
    });
    const error = await provider
      .judge({ image: Buffer.from('I'), style, signal: signal() })
      .catch((e: unknown) => e);
    expect((error as ProviderError).retryable).toBe(true);
  });

  it('rejects a post that violates the schema as retryable', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith(
        chatBody(JSON.stringify({ title: 'x'.repeat(81), caption: 'c', hashtags: [] })),
      ),
    });
    const error = await provider
      .writePost({ product: Buffer.from('P'), style, signal: signal() })
      .catch((e: unknown) => e);
    expect((error as ProviderError).retryable).toBe(true);
  });

  it('parses and clamps the judge score to [0, 1]', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith(chatBody(JSON.stringify({ score: 1.5 }))),
    });
    expect(await provider.judge({ image: Buffer.from('I'), style, signal: signal() })).toEqual({
      score: 1,
    });
  });

  it('classifies a 429 as retryable', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith('rate', 429),
    });
    const error = await provider
      .writePost({ product: Buffer.from('P'), style, signal: signal() })
      .catch((e: unknown) => e);
    expect((error as ProviderError).retryable).toBe(true);
  });

  it('describes the reference style and keeps only string palette entries', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith(
        chatBody(JSON.stringify({ descriptor: 'sunlit linen', palette: ['#fff', 5, '#eee'] })),
      ),
    });
    const analysis = await provider.describeStyle({ refs: [Buffer.from('R')], signal: signal() });
    expect(analysis.descriptor).toBe('sunlit linen');
    expect(analysis.palette).toEqual(['#fff', '#eee']);
  });

  it('treats a style response with no descriptor as retryable', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith(chatBody(JSON.stringify({ palette: [] }))),
    });
    const error = await provider
      .describeStyle({ refs: [Buffer.from('R')], signal: signal() })
      .catch((e: unknown) => e);
    expect((error as ProviderError).retryable).toBe(true);
  });
});
