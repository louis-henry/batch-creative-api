# Performance

The workload is I/O-bound: the batch is dominated by hosted provider calls.

## Concurrency

- Batch items run concurrently with a **bounded** pool (`p-limit`) so a large
  batch can't exhaust provider rate limits or local memory.
- The bound is configurable per request, with a sane default.

## Timeouts & failure cost

- Every provider attempt has a timeout (`AbortController`). A hung provider is
  abandoned and retried/failed-over rather than blocking the batch.
- Backoff is exponential **with jitter** to avoid synchronized retry storms.

## Image work

- Exactly one image-generation call per product (plus the shared style read); the
  result is stored as-is, with no compositing or resize step in the request path.

## Cost

- Generation is the expensive operation. The style spec is extracted **once** per
  batch (not per image). Cheap/free-tier models are the default.
- Failover only fires on real failure (or the chaos demo toggle), so the secondary
  provider is rarely paid for.

## What we'd add for scale

Persistent job store + queue/workers, content-hash caching of identical inputs,
and request-level concurrency limits. Called out as explicit cuts in the README.
