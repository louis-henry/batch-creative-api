import type { ImageProvider, ImageRequest } from '../../../application/ports/imageProvider.js';
import { ProviderError } from '../../../application/resilience/errors.js';
import { ensureOk, fetchText, parseJson, type FetchFn } from '../providerHttp.js';
import { buildImagePrompt } from '../prompts.js';

const ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

interface GeminiResponse {
  candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
}

const imagePart = (image: Buffer): { inlineData: { mimeType: string; data: string } } => ({
  inlineData: { mimeType: 'image/png', data: image.toString('base64') },
});

export function createGeminiImageProvider(deps: {
  apiKey: string;
  fetchFn?: FetchFn;
}): ImageProvider {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    name: 'gemini',
    async generate({ product, refs, style, signal }: ImageRequest): Promise<Buffer> {
      const parts = [imagePart(product), ...refs.map(imagePart), { text: buildImagePrompt(style) }];
      const { status, text } = await fetchText(
        'gemini',
        ENDPOINT,
        {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': deps.apiKey },
          body: JSON.stringify({ contents: [{ parts }] }),
        },
        fetchFn,
      );
      ensureOk('gemini', status, text);
      return extractImage(parseJson<GeminiResponse>('gemini', text));
    },
  };
}

function extractImage(body: GeminiResponse): Buffer {
  for (const part of body.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, 'base64');
  }
  throw new ProviderError('gemini returned no image', { retryable: true });
}
