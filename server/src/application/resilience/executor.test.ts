import { describe, it, expect } from 'vitest';
import { execute, type Provider } from './executor.js';
import { ProviderError } from './errors.js';
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

  it('throws an AggregateError carrying every provider failure when all fail', async () => {
    const a = provider('a', async () => {
      throw retryable();
    });
    const b = provider('b', async () => {
      throw retryable();
    });
    const error = await execute([a, b], policy, noWait).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toHaveLength(2);
  });

  it('requires at least one provider', async () => {
    await expect(execute([], policy, noWait)).rejects.toThrow('at least one provider');
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
