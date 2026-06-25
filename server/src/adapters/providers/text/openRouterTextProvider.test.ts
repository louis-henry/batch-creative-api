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
  it('requests structured copy with the image and returns parsed Copy', async () => {
    let captured: RequestInit | undefined;
    const fetchFn = (_url: string, init: RequestInit): Promise<Response> => {
      captured = init;
      return Promise.resolve(
        new Response(chatBody(JSON.stringify({ headline: 'Hi', subtext: 'there', cta: 'Shop' }))),
      );
    };

    const sig = signal();
    const copy = await createOpenRouterTextProvider({ apiKey: 'k', fetchFn }).copy({
      product: Buffer.from('P'),
      style,
      signal: sig,
    });

    expect(copy).toEqual({ headline: 'Hi', subtext: 'there', cta: 'Shop' });
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
      .copy({ product: Buffer.from('P'), style, signal: signal() })
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

  it('rejects copy that violates the schema as retryable', async () => {
    const provider = createOpenRouterTextProvider({
      apiKey: 'k',
      fetchFn: respondWith(
        chatBody(JSON.stringify({ headline: 'x'.repeat(61), subtext: '', cta: 'go' })),
      ),
    });
    const error = await provider
      .copy({ product: Buffer.from('P'), style, signal: signal() })
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
      .copy({ product: Buffer.from('P'), style, signal: signal() })
      .catch((e: unknown) => e);
    expect((error as ProviderError).retryable).toBe(true);
  });
});
