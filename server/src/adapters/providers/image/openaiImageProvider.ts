import type { ImageProvider, ImageRequest } from '../../../application/ports/imageProvider.js';
import { ProviderError } from '../../../application/resilience/errors.js';
import { ensureOk, fetchText, parseJson, type FetchFn } from '../providerHttp.js';
import { buildImagePrompt } from '../prompts.js';

const ENDPOINT = 'https://api.openai.com/v1/images/edits';

interface OpenAiImageResponse {
  data?: { b64_json?: string }[];
}

export function createOpenAiImageProvider(deps: {
  apiKey: string;
  fetchFn?: FetchFn;
}): ImageProvider {
  const fetchFn = deps.fetchFn ?? fetch;
  return {
    name: 'openai',
    // The edits endpoint conditions only on the product image; the reference
    // style is already encoded in StyleSpec and carried via the prompt.
    async generate({ product, style, signal }: ImageRequest): Promise<Buffer> {
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', buildImagePrompt(style));
      form.append(
        'image',
        new Blob([new Uint8Array(product)], { type: 'image/png' }),
        'product.png',
      );

      const { status, text } = await fetchText(
        'openai',
        ENDPOINT,
        { method: 'POST', signal, headers: { Authorization: `Bearer ${deps.apiKey}` }, body: form },
        fetchFn,
      );
      ensureOk('openai', status, text);
      return extractImage(parseJson<OpenAiImageResponse>('openai', text));
    },
  };
}

function extractImage(body: OpenAiImageResponse): Buffer {
  const b64 = body.data?.[0]?.b64_json;
  if (!b64) throw new ProviderError('openai returned no image', { retryable: true });
  return Buffer.from(b64, 'base64');
}
