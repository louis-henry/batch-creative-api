# 4. Multi-provider failover via a generic resilience executor

Date: 2026-06-25

## Status

Accepted

## Context

The track requires "reliability and consistency at scale: retries, multi-provider
failover." Generative-AI providers are flaky, rate-limited, and occasionally have
vendor-wide outages. A single vendor (even with retries) does not survive a vendor
outage — retrying the same failing vendor is not failover.

## Decision

Implement one **generic resilience executor** that takes an ordered list of
providers and a retry policy. Per provider: retry with exponential backoff + jitter
and a per-attempt timeout; on exhaustion, fail over to the next provider; if all
fail, throw an `AggregateError` with every cause. The executor is provider-agnostic
and wraps both image and text calls.

For images we use two editing-capable vendors (Gemini 2.5 Flash Image primary,
OpenAI `gpt-image-1` failover). For text we use OpenRouter, which adds model-level
fallback behind a single key.

## Consequences

- The failover logic is **ours and visible** (the graded competency), not hidden
  inside a gateway.
- DRY/SRP: one tested unit handles all retry/failover; adapters stay thin.
- Backoff and retryable-classification are pure functions → deterministic tests.
- A `CHAOS` flag forces the primary to fail so failover is demonstrable end-to-end.
- Cost stays low: the secondary fires only on real failure or the demo flag.
