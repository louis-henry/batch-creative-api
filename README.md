# Batch Creative Studio

Turn **N product images + 1–2 reference images** into ready-to-post social posts —
one styled, in-context product image per product paired with a generated
**title, caption, and hashtags** — with the engineering that makes generative AI
usable in production: **retries**, **multi-provider failover**, and a **consistent
visual style** across the batch.

> Engineering take-home, Track 02 (Batch Creative API).

![Batch Creative Studio](docs/assets/studio.png)

## What it does

Upload a set of product photos and a couple of reference images that set the mood.
The app reads the style from the references once, then for every product it
generates an in-context image and writes a matching social post (title, caption,
hashtags), streaming progress back to the UI — continuing past any single failure.

## How it works

```
POST /batch  (products[], refs[])  → { jobId }                    work continues async
GET  /batch/:jobId           → { status, succeeded[], failed[] }  the UI polls until done

per batch:   style = describe(refs)              once, applied to every product
per product: image = execute([gemini, openai])   retry + failover (+ optional judge gate)
             post  = openrouter(structured)       title/caption/hashtags, Zod-validated
             store image + social post
             → partial success: one item failing never fails the batch
```

The reliability layer is a single generic **resilience executor** wrapping every
provider call: exponential backoff + jitter, per-attempt `AbortController`
timeout, failover to the next provider, and a structured `AggregateError` if all
fail. A **chaos toggle** forces the primary image provider to fail so failover is
observable live in the UI. Visual consistency comes from a **style spec** derived
once from the references and applied to every product, with a stable seed passed
to providers that support it (Gemini).

## Quickstart (local)

Requires Node 22+ and pnpm (`corepack enable` provides it).

```bash
pnpm install
cp .env.example server/.env        # add your provider keys (see below)

pnpm --filter @app/server dev      # API on :8787
# then, in a second terminal:
pnpm --filter @app/web dev         # UI on :5173
```

Open http://localhost:5173, pick a couple of the built-in product samples and a
reference (or upload your own), then **Generate**. Flip **Chaos mode** first to
watch failover from the primary to the secondary provider.

### Environment

| Variable             | Required | Purpose                                                                                     |
| -------------------- | -------- | ------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` | yes      | Post copy (title/caption/hashtags) + style read + judge ([key](https://openrouter.ai/keys)) |
| `GEMINI_API_KEY`     | one of\* | Primary image provider ([key](https://aistudio.google.com/apikey))                          |
| `OPENAI_API_KEY`     | one of\* | Failover image provider ([key](https://platform.openai.com/api-keys))                       |
| `PORT`               | no       | API port (default 8787)                                                                     |
| `PUBLIC_BASE_URL`    | no       | Base URL images are served from                                                             |
| `WEB_ORIGIN`         | no       | Allowed CORS origin (defaults to any)                                                       |
| `JUDGE_THRESHOLD`    | no       | Enable the LLM quality gate (0–1); off when unset                                           |

\* Set at least one image provider. With both, Gemini is primary and OpenAI is the failover (and Chaos mode demos failover between them).

The web app reads `VITE_API_URL` (defaults to `http://localhost:8787`).

## Tech stack

- **API:** Node + TypeScript (strict), Hono, Zod, p-limit, pino
- **Providers:** OpenRouter (post copy + style + judge), Gemini 2.5 Flash Image +
  OpenAI `gpt-image-1` (images, behind one port)
- **Web:** Vite + React + Tailwind v4 + shadcn-style Radix components, Zustand,
  TanStack Query, Framer Motion, sonner
- **Shared:** `@app/contracts` — Zod schemas used by both API and web

## Quality

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all green; CI runs them on every PR.
- **92 behaviour-focused tests** covering the resilience executor, batch
  orchestration, providers (via injected `fetch`), and the HTTP layer.
- Standards are **machine-enforced** (ESLint complexity caps, Husky, commitlint) —
  see [`docs/governance/`](docs/governance).
- Every phase shipped as a reviewed PR; see [the architecture decisions](docs/architecture/adr).

## Scoping & judgment

The brief asks for a focused half-day and values judgment over polish. Deliberate cuts:

- **No queue/workers** — in-memory job store + polling is enough at this scale; a
  real queue is the first production add. No DB, no auth, no accounts.
- **No global rate-limit / cross-batch concurrency cap** — per-request body and
  per-batch concurrency are bounded; the rest is documented in
  [`docs/governance/security.md`](docs/governance/security.md).
- The **judge gate** is wired but defaults off (cost); enable via `JUDGE_THRESHOLD`.

Effort went into the things the track actually grades: visible, tested failover;
consistent style; validated AI outputs; and a UI that demonstrates it.

## Deploying

See [`docs/deploy.md`](docs/deploy.md) — API on Railway/Render (long-lived, for the
async batch), web on Vercel (static), with the env wiring for both.

## Repository layout

```
server/              Hono API (the deliverable)
web/                 Vite + React demo
packages/contracts/  Zod schemas shared by server + web
docs/                governance, architecture (ADRs), deploy guide
```
