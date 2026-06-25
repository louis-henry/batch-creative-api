import { ProviderError } from '../../application/resilience/errors.js';

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Maps a non-2xx response to a typed ProviderError. 429 and 5xx are retryable
 * (transient); 4xx are not (the request is wrong and won't improve on retry).
 */
export function ensureOk(provider: string, status: number, bodyText: string): void {
  if (status >= 200 && status < 300) return;
  throw new ProviderError(`${provider} responded with HTTP ${status}`, {
    retryable: status === 429 || status >= 500,
    status,
    cause: bodyText.slice(0, 300),
  });
}

/**
 * Performs the request and reads the body, wrapping transport failures as a
 * retryable ProviderError (this is the contract the resilience executor relies
 * on: raw network errors must be classified retryable, not unknown).
 */
export async function fetchText(
  provider: string,
  url: string,
  init: RequestInit,
  fetchFn: FetchFn,
): Promise<{ status: number; text: string }> {
  let response: Response;
  try {
    response = await fetchFn(url, init);
  } catch (cause) {
    throw new ProviderError(`${provider} request failed`, { retryable: true, cause });
  }
  return { status: response.status, text: await response.text() };
}

export function parseJson<T>(provider: string, text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new ProviderError(`${provider} returned malformed JSON`, { retryable: true, cause });
  }
}

export function dataUrl(image: Buffer, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${image.toString('base64')}`;
}
