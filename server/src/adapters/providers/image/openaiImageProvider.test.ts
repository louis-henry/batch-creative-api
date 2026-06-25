import { describe, it, expect } from 'vitest';
import { createOpenAiImageProvider } from './openaiImageProvider.js';
import type { ImageRequest } from '../../../application/ports/imageProvider.js';
import type { ProviderError } from '../../../application/resilience/errors.js';
import { buildStyleSpec } from '../../../domain/style/styleSpec.js';

const style = buildStyleSpec({ descriptor: 'warm studio' });
const request = (): ImageRequest => ({
  product: Buffer.from('PROD'),
  refs: [],
  style,
  signal: new AbortController().signal,
});

const openaiBody = (imageB64: string): string => JSON.stringify({ data: [{ b64_json: imageB64 }] });

describe('openaiImageProvider', () => {
  it('posts a multipart form and returns the decoded image', async () => {
    let captured: RequestInit | undefined;
    const fetchFn = (_url: string, init: RequestInit): Promise<Response> => {
      captured = init;
      return Promise.resolve(new Response(openaiBody(Buffer.from('IMG').toString('base64'))));
    };

    const out = await createOpenAiImageProvider({ apiKey: 'k', fetchFn }).generate(request());

    expect(out).toEqual(Buffer.from('IMG'));
    expect((captured?.body as FormData).get('model')).toBe('gpt-image-1');
    expect((captured?.headers as Record<string, string>).Authorization).toBe('Bearer k');
  });

  it('classifies a 429 as retryable', async () => {
    const error = await createOpenAiImageProvider({
      apiKey: 'k',
      fetchFn: () => Promise.resolve(new Response('rate limited', { status: 429 })),
    })
      .generate(request())
      .catch((e: unknown) => e);

    expect((error as ProviderError).retryable).toBe(true);
  });

  it('treats a response with no image as retryable', async () => {
    const error = await createOpenAiImageProvider({
      apiKey: 'k',
      fetchFn: () => Promise.resolve(new Response(JSON.stringify({ data: [] }))),
    })
      .generate(request())
      .catch((e: unknown) => e);

    expect((error as ProviderError).retryable).toBe(true);
  });
});
