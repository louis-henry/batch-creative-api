import { describe, it, expect } from 'vitest';
import { createGeminiImageProvider } from './geminiImageProvider.js';
import type { ImageRequest } from '../../../application/ports/imageProvider.js';
import { ProviderError } from '../../../application/resilience/errors.js';
import { buildStyleSpec } from '../../../domain/style/styleSpec.js';

const style = buildStyleSpec({ descriptor: 'warm studio' });
const request = (): ImageRequest => ({
  product: Buffer.from('PROD'),
  refs: [Buffer.from('REF')],
  style,
  signal: new AbortController().signal,
});

const geminiBody = (imageB64: string): string =>
  JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: imageB64 } }] } }] });

describe('geminiImageProvider', () => {
  it('sends the product as inline data and returns the generated image', async () => {
    let captured: RequestInit | undefined;
    const fetchFn = (_url: string, init: RequestInit): Promise<Response> => {
      captured = init;
      return Promise.resolve(new Response(geminiBody(Buffer.from('IMG').toString('base64'))));
    };

    const out = await createGeminiImageProvider({ apiKey: 'k', fetchFn }).generate(request());

    expect(out).toEqual(Buffer.from('IMG'));
    const body = JSON.parse(String(captured?.body)) as {
      contents: { parts: { inlineData?: { data: string } }[] }[];
    };
    expect(body.contents[0]?.parts[0]?.inlineData?.data).toBe(
      Buffer.from('PROD').toString('base64'),
    );
    expect((captured?.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
  });

  it('classifies a 500 as retryable and a 400 as non-retryable', async () => {
    const at = (status: number): Promise<unknown> =>
      createGeminiImageProvider({
        apiKey: 'k',
        fetchFn: () => Promise.resolve(new Response('err', { status })),
      })
        .generate(request())
        .catch((e: unknown) => e);

    expect(((await at(500)) as ProviderError).retryable).toBe(true);
    expect(((await at(400)) as ProviderError).retryable).toBe(false);
  });

  it('wraps a network error as a retryable ProviderError', async () => {
    const error = await createGeminiImageProvider({
      apiKey: 'k',
      fetchFn: () => Promise.reject(new Error('ECONNRESET')),
    })
      .generate(request())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).retryable).toBe(true);
  });

  it('treats a response with no image as retryable', async () => {
    const error = await createGeminiImageProvider({
      apiKey: 'k',
      fetchFn: () => Promise.resolve(new Response(JSON.stringify({ candidates: [] }))),
    })
      .generate(request())
      .catch((e: unknown) => e);

    expect((error as ProviderError).retryable).toBe(true);
  });
});
