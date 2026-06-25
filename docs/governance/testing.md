# Testing

We test to gain confidence in **behavior**, not to chase a coverage number.

## What we test

- **Logic-bearing units**: the resilience executor (retries, failover, timeouts),
  batch aggregation (partial success), backoff/retry policy, format/layout math,
  style-spec extraction, the compositor's output dimensions.
- **Boundaries**: request validation, error mapping.

## What we don't test

- Framework glue and trivial pass-throughs.
- Vendor SDK internals — we test our adapter's request shape and our handling of
  responses, not the provider.
- Snapshot/boilerplate tests that assert nothing meaningful.

## How we test

- **Behavior over implementation.** Assert observable outcomes, not internal calls.
- **Fakes over mock-everything.** A configurable fake provider (fails N times,
  then succeeds; always fails; times out) exercises the real orchestration paths.
  Reach for a mock only at a true boundary.
- **Deterministic.** Pure policy functions (backoff, jitter bounds, retryable
  classification) are unit-tested with fixed inputs. Inject time/jitter sources so
  tests don't depend on the clock.
- **Name tests after the behavior**: `fails over to the secondary provider when the
primary exhausts retries`.

## Running

```bash
pnpm test          # once (CI + pre-push)
pnpm test:watch    # TDD loop
```

New behavior must arrive with a test that would fail without it.
