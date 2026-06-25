import { backoffDelay, isRetryable, type RetryPolicy } from './policy.js';
import { TimeoutError } from './errors.js';

/** A named, abortable operation — typically one vendor's implementation. */
export interface Provider<T> {
  readonly name: string;
  run(signal: AbortSignal): Promise<T>;
}

/** Injectable side effects, so tests stay deterministic and instant. */
export interface ExecuteDeps {
  sleep?: (ms: number) => Promise<void>;
  jitter?: () => number;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs providers in order. Each provider is retried per the policy with
 * backoff; on exhaustion (or a non-retryable error) the next provider is tried.
 * If all fail, throws an `AggregateError` carrying every provider's last error.
 */
export async function execute<T>(
  providers: readonly Provider<T>[],
  policy: RetryPolicy,
  deps: ExecuteDeps = {},
): Promise<T> {
  if (providers.length === 0) {
    throw new Error('execute requires at least one provider');
  }
  const sleep = deps.sleep ?? defaultSleep;
  const jitter = deps.jitter ?? Math.random;
  const failures: Error[] = [];

  for (const provider of providers) {
    try {
      return await runWithRetries(provider, policy, sleep, jitter);
    } catch (error) {
      failures.push(asError(error));
    }
  }
  throw new AggregateError(failures, `all ${providers.length} providers failed`);
}

async function runWithRetries<T>(
  provider: Provider<T>,
  policy: RetryPolicy,
  sleep: (ms: number) => Promise<void>,
  jitter: () => number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      return await withTimeout(provider, policy.attemptTimeoutMs);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === policy.maxRetries) break;
      await sleep(backoffDelay(attempt, policy, jitter));
    }
  }
  throw asError(lastError);
}

async function withTimeout<T>(provider: Provider<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new TimeoutError(provider.name, timeoutMs));
      }, timeoutMs);
    });
    return await Promise.race([provider.run(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}
