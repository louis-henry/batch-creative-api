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
    async generate({ product, refs, style, signal }: ImageRequest): Promise<Buffer> {
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', buildImagePrompt(style));
      // Explicit size + quality keep latency and cost predictable (~$0.04/image at
      // medium).
      form.append('size', '1024x1024');
      form.append('quality', 'medium');
      // gpt-image-1 edits accept multiple inputs: the product is the image being
      // edited, the references guide the scene and palette, so the failover path
      // holds the same look as the Gemini primary instead of degrading to text only.
      const addImage = (buf: Buffer, name: string): void =>
        form.append('image[]', new Blob([new Uint8Array(buf)], { type: 'image/png' }), name);
      addImage(product, 'product.png');
      refs.forEach((ref, i) => addImage(ref, `ref-${String(i)}.png`));

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
