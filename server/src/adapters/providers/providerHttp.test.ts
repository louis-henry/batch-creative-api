import { describe, it, expect } from 'vitest';
import { ensureOk, fetchText } from './providerHttp.js';
import { ProviderError } from '../../application/resilience/errors.js';

const grab = (status: number, body = 'b'): ProviderError => {
  try {
    ensureOk('x', status, body);
  } catch (e) {
    return e as ProviderError;
  }
  throw new Error('expected ensureOk to throw');
};

describe('ensureOk', () => {
  it('passes 2xx and classifies 429/5xx retryable, 4xx not', () => {
    expect(() => ensureOk('x', 204, '')).not.toThrow();
    expect(grab(429).retryable).toBe(true);
    expect(grab(503).retryable).toBe(true);
    expect(grab(400).retryable).toBe(false);
  });

  it('redacts key-shaped tokens from the captured error body', () => {
    const err = grab(401, 'Incorrect API key: sk-proj-ABCDEFGH1234. See docs.');
    const cause = String((err as { cause?: unknown }).cause);
    expect(cause).toContain('[redacted]');
    expect(cause).not.toContain('sk-proj-ABCDEFGH1234');
  });
});

describe('fetchText', () => {
  it('rethrows an AbortError unchanged (intentional cancellation, not retried)', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    const error = await fetchText('x', 'u', {}, () => Promise.reject(abort)).catch(
      (e: unknown) => e,
    );
    expect(error).toBe(abort);
  });

  it('wraps a transport failure as a retryable ProviderError', async () => {
    const error = await fetchText('x', 'u', {}, () =>
      Promise.reject(new Error('ECONNRESET')),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).retryable).toBe(true);
  });
});
