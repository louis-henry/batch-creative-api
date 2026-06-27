export interface RateLimit {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateGuard {
  /** Returns true if the event is allowed, recording it; false once the window is full. */
  allow(key: string, limit: RateLimit, now?: number): boolean;
}

/**
 * In-memory sliding-window counter. A basic spend guard for the public deploy:
 * it bounds how often the paid `/batch` endpoint can fire, both globally and per
 * client IP. State is process-local (resets on restart), which is enough at this
 * scale — the hard backstop is the provider-side spend caps, not this.
 */
export function createRateGuard(): RateGuard {
  const hits = new Map<string, number[]>();
  return {
    allow(key, { limit, windowMs }, now = Date.now()) {
      const recent = (hits.get(key) ?? []).filter((t) => t > now - windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}
