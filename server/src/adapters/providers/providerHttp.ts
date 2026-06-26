import { ProviderError } from '../../application/resilience/errors.js';

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

// Provider error bodies sometimes echo a partial API key (e.g. OpenAI on 401).
// Scrub key-shaped tokens before the body is attached to an error.
const SECRET_PATTERN = /\b(?:sk|sk-proj|sk-or|AIza)[A-Za-z0-9_-]{6,}/g;

function redactSecrets(text: string): string {
  return text.replace(SECRET_PATTERN, '[redacted]');
}

/**
 * Maps a non-2xx response to a typed ProviderError. 429 and 5xx are retryable
 * (transient); 4xx are not (the request is wrong and won't improve on retry).
 * The body is kept on `cause` (server-side, scrubbed) for debugging; callers
 * must derive any client-facing reason from `error.message`, never `cause`.
 */
export function ensureOk(provider: string, status: number, bodyText: string): void {
  if (status >= 200 && status < 300) return;
  throw new ProviderError(`${provider} responded with HTTP ${status}`, {
    retryable: status === 429 || status >= 500,
    status,
    // Redact before slicing so a token straddling the cutoff can't leave a fragment.
    cause: redactSecrets(bodyText).slice(0, 300),
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
  try {
    const response = await fetchFn(url, init);
    return { status: response.status, text: await response.text() };
  } catch (cause) {
    // An intentional cancellation is not a transient transport failure — let it
    // propagate so it isn't retried. Reading the body is inside the try too, so
    // a stream error mid-drain is classified retryable like any transport fault.
    if (cause instanceof Error && cause.name === 'AbortError') throw cause;
    throw new ProviderError(`${provider} request failed`, { retryable: true, cause });
  }
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
