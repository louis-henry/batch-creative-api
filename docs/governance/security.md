# Security

Scope-appropriate for a take-home, but with production instincts.

## Secrets

- All credentials come from environment variables, validated at startup
  (`server/src/config/env.ts`). Missing/invalid keys fail fast and loud.
- `.env` is gitignored; only `.env.example` (no values) is committed.
- Secrets are **never logged**. The logger redacts known sensitive keys; provider
  errors are logged by type/status, not with auth headers or payloads.

## Input boundaries

- Every request is validated with Zod at the `interface` layer before reaching
  application logic. Reject early with a typed `ValidationError`.
- Validate the **shape and size** of uploaded images (count, byte limit, and a
  best-effort MIME check — the declared `Content-Type` is client-supplied, so it's
  a hint; the image providers reject genuine non-images downstream).
- Outbound provider responses are treated as untrusted: parse/validate before use.

## Dependencies

- Prefer well-maintained, widely-used packages. Pin via the lockfile.
- CI runs on every PR; keep the dependency surface small and intentional.

## Provider responses

- Provider error bodies can echo a partial credential (e.g. some APIs include the
  offending key on a 401). The body is kept only server-side on `error.cause`,
  scrubbed of key-shaped tokens. Client-facing `ItemFailure.reason` must be derived
  from `error.message` only — never from `cause` or a full error serialization.
- Response bodies are read fully into memory. The endpoints are hardcoded, trusted
  vendor APIs returning JSON envelopes, so this is acceptable; a body-size ceiling
  is the hardening step if untrusted endpoints are ever added.

## Known limits (scope cuts)

Deliberately deferred for this take-home, with the production fix noted:

- **Per-request body** is capped (`bodyLimit`) and uploads are validated for count,
  MIME, and size before buffering. There is **no global cap on concurrent batches**
  and **no auth/rate-limit** on the endpoint — production would add a request rate
  limit, a process-wide in-flight-batch semaphore, and a shared key, plus TTL/size
  eviction on the **job store (memory) and the `.output` image directory (disk)**,
  to bound memory, disk, and provider spend.
- **`GET /batch/:id`** has no per-caller ownership binding; job ids are unguessable
  (UUIDv4), so enumeration is impractical, but an auth model would bind job to caller.

## Output

- Generated images are written to a scoped output directory and served read-only.
- No user-controlled path is ever concatenated into a filesystem path without
  normalization.
