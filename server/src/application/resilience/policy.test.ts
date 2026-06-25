import { describe, it, expect } from 'vitest';
import { backoffDelay, isRetryable, type RetryPolicy } from './policy.js';
import { ProviderError, TimeoutError } from './errors.js';

const policy: RetryPolicy = { maxRetries: 5, baseMs: 100, maxMs: 2000, attemptTimeoutMs: 1000 };

describe('backoffDelay', () => {
  it('grows exponentially and caps at maxMs (jitter at its max)', () => {
    const max = (): number => 1;
    expect(backoffDelay(0, policy, max)).toBe(100);
    expect(backoffDelay(1, policy, max)).toBe(200);
    expect(backoffDelay(2, policy, max)).toBe(400);
    expect(backoffDelay(10, policy, max)).toBe(2000); // 100 * 2^10 capped at maxMs
  });

  it('stays within [0, capped] for any jitter value', () => {
    expect(backoffDelay(3, policy, () => 0)).toBe(0);
    expect(backoffDelay(3, policy, () => 0.5)).toBe(400); // floor(0.5 * 800)
  });
});

describe('isRetryable', () => {
  it('treats timeouts as retryable', () => {
    expect(isRetryable(new TimeoutError('x', 10))).toBe(true);
  });

  it('honors the provider error verdict', () => {
    expect(isRetryable(new ProviderError('5xx', { retryable: true }))).toBe(true);
    expect(isRetryable(new ProviderError('4xx', { retryable: false }))).toBe(false);
  });

  it('treats unknown errors as non-retryable', () => {
    expect(isRetryable(new Error('boom'))).toBe(false);
    expect(isRetryable('weird')).toBe(false);
  });
});
