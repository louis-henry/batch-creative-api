import { describe, it, expect } from 'vitest';
import { execute, type Provider } from './executor.js';
import { ProviderError, TimeoutError } from './errors.js';
import type { RetryPolicy } from './policy.js';

const policy: RetryPolicy = { maxRetries: 2, baseMs: 1, maxMs: 5, attemptTimeoutMs: 50 };
// Deterministic + instant: no real backoff waiting in tests.
const noWait = { sleep: (): Promise<void> => Promise.resolve(), jitter: (): number => 0 };

const retryable = (): ProviderError => new ProviderError('transient', { retryable: true });
const fatal = (): ProviderError => new ProviderError('bad request', { retryable: false });

type Counting = Provider<string> & { calls: number };

function provider(name: string, behavior: (call: number) => Promise<string>): Counting {
  return {
    name,
    calls: 0,
    async run() {
      this.calls += 1;
      return behavior(this.calls);
    },
  };
}

describe('execute', () => {
  it('returns the first provider result without retrying on success', async () => {
    const a = provider('a', async () => 'ok');
    expect(await execute([a], policy, noWait)).toBe('ok');
    expect(a.calls).toBe(1);
  });

  it('retries a retryable failure, then succeeds', async () => {
    const a = provider('a', async (call) => {
      if (call <= 2) throw retryable();
      return 'ok';
    });
    expect(await execute([a], policy, noWait)).toBe('ok');
    expect(a.calls).toBe(3); // first try + 2 retries
  });

  it('does not retry a non-retryable error and fails over immediately', async () => {
    const a = provider('a', async () => {
      throw fatal();
    });
    const b = provider('b', async () => 'from-b');
    expect(await execute([a, b], policy, noWait)).toBe('from-b');
    expect(a.calls).toBe(1);
    expect(b.calls).toBe(1);
  });

  it('fails over to the next provider after exhausting retries', async () => {
    const a = provider('a', async () => {
      throw retryable();
    });
    const b = provider('b', async () => 'from-b');
    expect(await execute([a, b], policy, noWait)).toBe('from-b');
    expect(a.calls).toBe(3);
  });

  it('aggregates each provider final error, in provider order, when all fail', async () => {
    const a = provider('a', async () => {
      throw new ProviderError('a-final', { retryable: true });
    });
    const b = provider('b', async () => {
      throw new ProviderError('b-final', { retryable: true });
    });
    const error = (await execute([a, b], { ...policy, maxRetries: 0 }, noWait).catch(
      (e: unknown) => e,
    )) as AggregateError;
    expect(error).toBeInstanceOf(AggregateError);
    expect(error.errors.map((e: Error) => e.message)).toEqual(['a-final', 'b-final']);
  });

  it('does not invoke later providers once one succeeds', async () => {
    const a = provider('a', async () => {
      throw fatal();
    });
    const b = provider('b', async () => 'from-b');
    const c = provider('c', async () => 'from-c');
    expect(await execute([a, b, c], policy, noWait)).toBe('from-b');
    expect(c.calls).toBe(0);
  });

  it('does not retry an unknown (non-provider) error', async () => {
    const a = provider('a', async () => {
      throw new Error('bug');
    });
    const error = (await execute([a], policy, noWait).catch((e: unknown) => e)) as AggregateError;
    expect(a.calls).toBe(1);
    expect(error.errors[0]?.message).toBe('bug');
  });

  it('sleeps with exponential backoff between retries, but not after the final attempt', async () => {
    const delays: number[] = [];
    const recording = {
      sleep: (ms: number): Promise<void> => {
        delays.push(ms);
        return Promise.resolve();
      },
      jitter: (): number => 1,
    };
    const a = provider('a', async () => {
      throw retryable();
    });
    await execute(
      [a],
      { maxRetries: 2, baseMs: 1, maxMs: 5, attemptTimeoutMs: 50 },
      recording,
    ).catch(() => undefined);
    expect(a.calls).toBe(3);
    expect(delays).toEqual([1, 2]); // backoffDelay(0), backoffDelay(1); no sleep after the 3rd attempt
  });

  it('does not sleep when the first attempt succeeds', async () => {
    const delays: number[] = [];
    const recording = {
      sleep: (ms: number): Promise<void> => {
        delays.push(ms);
        return Promise.resolve();
      },
      jitter: (): number => 1,
    };
    await execute([provider('a', async () => 'ok')], policy, recording);
    expect(delays).toEqual([]);
  });

  it('requires at least one provider', async () => {
    await expect(execute([], policy, noWait)).rejects.toThrow('at least one provider');
  });

  it('retries the same provider after a timeout when retries remain', async () => {
    let call = 0;
    const flaky: Provider<string> = {
      name: 'flaky',
      run: (signal) =>
        new Promise<string>((resolve, reject) => {
          call += 1;
          if (call === 1) {
            signal.addEventListener('abort', () => {
              reject(new Error('aborted'));
            });
          } else {
            resolve('recovered');
          }
        }),
    };
    const fast: RetryPolicy = { maxRetries: 1, baseMs: 1, maxMs: 5, attemptTimeoutMs: 20 };
    expect(await execute([flaky], fast, noWait)).toBe('recovered');
    expect(call).toBe(2);
  });

  it('surfaces a TimeoutError (not the provider abort error) on timeout', async () => {
    const hang: Provider<string> = {
      name: 'hang',
      run: (signal) =>
        new Promise<string>((_, reject) => {
          // Cooperative: rejects synchronously on abort. The executor must still
          // surface a TimeoutError so the failure is classified as retryable.
          signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    };
    const fast: RetryPolicy = { maxRetries: 0, baseMs: 1, maxMs: 5, attemptTimeoutMs: 20 };
    const error = (await execute([hang], fast, noWait).catch((e: unknown) => e)) as AggregateError;
    expect(error.errors[0]).toBeInstanceOf(TimeoutError);
  });

  it('times out a hung provider, aborts its signal, and fails over', async () => {
    let aborted = false;
    const hang: Provider<string> = {
      name: 'hang',
      run: (signal) =>
        new Promise<string>((_, reject) => {
          signal.addEventListener('abort', () => {
            aborted = true;
            reject(new Error('aborted'));
          });
        }),
    };
    const b = provider('b', async () => 'from-b');
    const fast: RetryPolicy = { ...policy, maxRetries: 0, attemptTimeoutMs: 20 };
    expect(await execute([hang, b], fast, noWait)).toBe('from-b');
    expect(aborted).toBe(true);
    expect(b.calls).toBe(1);
  });
});
