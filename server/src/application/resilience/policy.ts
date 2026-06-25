import { ProviderError, TimeoutError } from './errors.js';

export interface RetryPolicy {
  /** Retries attempted after the first try, per provider. */
  readonly maxRetries: number;
  readonly baseMs: number;
  readonly maxMs: number;
  readonly attemptTimeoutMs: number;
}

/**
 * Full-jitter exponential backoff: a random delay in `[0, min(base·2^attempt,
 * maxMs)]`. The randomness spreads retries so failing providers aren't hammered
 * in lockstep. `jitter` is injectable so tests are deterministic.
 */
export function backoffDelay(
  attempt: number,
  policy: RetryPolicy,
  jitter: () => number = Math.random,
): number {
  const exponential = policy.baseMs * 2 ** attempt;
  const capped = Math.min(exponential, policy.maxMs);
  return Math.floor(jitter() * capped);
}

/**
 * Timeouts are always retryable. Provider errors carry their own verdict (e.g.
 * 5xx/429 retryable, 4xx not). Anything else is treated as non-retryable so
 * unexpected bugs surface instead of being silently retried.
 */
export function isRetryable(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof ProviderError) return error.retryable;
  return false;
}
