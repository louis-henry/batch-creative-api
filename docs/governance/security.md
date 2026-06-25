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
- Validate the **shape and size** of uploaded images (count, mime, byte limit) to
  avoid resource exhaustion.
- Outbound provider responses are treated as untrusted: parse/validate before use.

## Dependencies

- Prefer well-maintained, widely-used packages. Pin via the lockfile.
- CI runs on every PR; keep the dependency surface small and intentional.

## Output

- Generated images are written to a scoped output directory and served read-only.
- No user-controlled path is ever concatenated into a filesystem path without
  normalization.
