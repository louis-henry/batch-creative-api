/** A provider call failed. `retryable` decides whether the executor retries it. */
export class ProviderError extends Error {
  readonly retryable: boolean;
  readonly status: number | undefined;

  constructor(message: string, options: { retryable: boolean; status?: number; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ProviderError';
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

/** A provider attempt exceeded its time budget and was aborted. Always retryable. */
export class TimeoutError extends Error {
  readonly providerName: string;
  readonly timeoutMs: number;

  constructor(providerName: string, timeoutMs: number) {
    super(`provider "${providerName}" timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.providerName = providerName;
    this.timeoutMs = timeoutMs;
  }
}
