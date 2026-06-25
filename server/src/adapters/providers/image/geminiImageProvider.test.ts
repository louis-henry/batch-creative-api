import { describe, it, expect } from 'vitest';
import { createGeminiImageProvider } from './geminiImageProvider.js';
import type { ImageRequest } from '../../../application/ports/imageProvider.js';
import { ProviderError } from '../../../application/resilience/errors.js';
import { buildStyleSpec } from '../../../domain/style/styleSpec.js';

const style = buildStyleSpec({ descriptor: 'warm studio' });
const b64 = (s: string): string => Buffer.from(s).toString('base64');

const request = (overrides: Partial<ImageRequest> = {}): ImageRequest => ({
  product: Buffer.from('PROD'),
  refs: [Buffer.from('REF')],
  style,
  signal: new AbortController().signal,
  ...overrides,
});

const geminiBody = (imageB64: string): string =>
  JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: imageB64 } }] } }] });

interface GeminiRequestBody {
  contents: { parts: ({ inlineData?: { data: string } } & { text?: string })[] }[];
  generationConfig?: { responseModalities?: string[] };
}

describe('geminiImageProvider', () => {
  it('sends product + refs as inline data with an IMAGE modality and forwards the signal', async () => {
    let captured: RequestInit | undefined;
    const fetchFn = (_url: string, init: RequestInit): Promise<Response> => {
      captured = init;
      return Promise.resolve(new Response(geminiBody(b64('IMG'))));
    };
    const signal = new AbortController().signal;

    const out = await createGeminiImageProvider({ apiKey: 'k', fetchFn }).generate(
      request({ refs: [Buffer.from('R1'), Buffer.from('R2')], signal }),
    );

    expect(out).toEqual(Buffer.from('IMG'));
    expect(captured?.signal).toBe(signal);
    expect((captured?.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
    const body = JSON.parse(String(captured?.body)) as GeminiRequestBody;
    const parts = body.contents[0]?.parts ?? [];
    expect(parts[0]?.inlineData?.data).toBe(b64('PROD'));
    expect(parts[1]?.inlineData?.data).toBe(b64('R1'));
    expect(parts[2]?.inlineData?.data).toBe(b64('R2'));
    expect(parts[3]?.text).toContain('warm studio');
    expect(body.generationConfig?.responseModalities).toEqual(['IMAGE']);
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

  it('treats a non-JSON 200 body as retryable', async () => {
    const error = await createGeminiImageProvider({
      apiKey: 'k',
      fetchFn: () => Promise.resolve(new Response('<html>502 Bad Gateway</html>')),
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
