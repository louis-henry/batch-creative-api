# Architecture Overview

## Goal

A batch endpoint that turns product images into styled social posts, built so that
flaky generative-AI providers behave reliably and produce a consistent visual style.

## Layers (ports & adapters)

```
interface/   Hono HTTP, validate, call application, map to HTTP responses
   │
application/ orchestration, batch fan-out, resilience executor, style extraction
   │  (depends on ports, never on vendor SDKs)
domain/      pure logic, style spec, result types
   ▲
adapters/    implement ports, image/text providers, storage, jobs
```

**Dependency rule:** arrows point inward. `domain` depends only on the shared
`@app/contracts` kernel (pure Zod schemas/types, no I/O), no vendor SDKs, no
framework; `application` depends on `domain` + ports; `adapters` implement those
ports; `interface` wires everything at the edge.

## Request flow

```
POST /batch (products[], refs[])
  → validate (Zod)
  → create job  → return { jobId }            (202-style: work continues async)
  → extractStyleSpec(refs)            once per batch
  → runBatch: for each product (bounded concurrency)
       image = execute([gemini, openai], retryPolicy)   retry + failover
       post  = openrouter.writePost(...)                 structured + validated
       [judge] score; retry/failover if below threshold
       store image + social post
  → aggregate → { succeeded[], failed[{ id, reason }] }

GET /batch/:jobId → status + results        (FE polls)
```

## Key components

- **Resilience executor** (`application/resilience`), generic over any provider:
  per provider, retry with exponential backoff + jitter and a per-attempt timeout;
  on exhaustion, fail over to the next provider; if all fail, throw an
  `AggregateError` carrying every cause. Backoff and retryable-classification are
  pure functions, unit-tested deterministically.
- **Style spec** (`application/style`), one vision pass over the references yields
  a reusable descriptor + seed, giving a coherent look across the whole batch.
- **Post copywriter** (`adapters/providers/text`), an OpenRouter LLM writes a
  structured social post (title, caption, hashtags) per product, Zod-validated.
- **Job store** (`adapters/jobs`), in-memory for this scope; the interface is
  ready to swap for Redis/Upstash without touching application logic.

## Failure model

Per-item isolation: one product failing never fails the batch. Failures are
collected with structured reasons and returned alongside successes (partial
success). The chaos toggle (a per-request flag) forces the primary image provider
to fail, making failover observable in the demo.

See the [ADRs](adr) for the reasoning behind the major choices.
