# Batch Creative API

Turn **N product images + 1–2 reference images** into styled social posts —
**square (1080²)**, **story (1080×1920)**, and **wide banner** — per product, with
the engineering that makes generative-AI usable in production: **retries**,
**multi-provider failover**, and a **consistent visual style** across the batch.

> Engineering take-home, Track 02 (Batch Creative API).

## Live demo

- App: _link added in Phase 6_
- Walkthrough (90s): _link added in Phase 6_

## Quickstart

```bash
pnpm install
cp .env.example .env   # add your keys
pnpm --filter @app/server dev
# in another shell
pnpm --filter @app/web dev
```

## How it works

```
POST /batch  { products[], refs[] }  → { jobId }
GET  /batch/:jobId                    → { succeeded[], failed[] }

per product:  style (extracted once from refs)
              → image  (provider chain: retry + failover)
              → copy   (structured, model fallback)
              → composite (overlay + resize to 3 formats)
```

The reliability layer is a single generic **resilience executor** that wraps every
provider call (exponential backoff + jitter, per-attempt timeout, failover to the
next provider, structured aggregate errors). A `CHAOS` flag forces the primary
image provider to fail so failover is observable end-to-end.

Visual consistency comes from a **style spec** derived once from the reference
images and applied — with a fixed seed — to every product.

## Architecture

Ports & adapters, layered: `domain` (pure) → `application` (orchestration +
resilience) → `adapters` (providers, compositor, storage, jobs) → `interface`
(HTTP). See [`docs/architecture/overview.md`](docs/architecture/overview.md) and
the [ADRs](docs/architecture/adr).

## Tech stack

- **API:** Node + TypeScript (strict), Hono, Zod, sharp, p-limit, pino
- **Providers:** OpenRouter (copy + judge), Gemini 2.5 Flash Image + OpenAI
  `gpt-image-1` (images, behind one port)
- **Web:** Vite + React + Tailwind + shadcn/ui + Zustand + TanStack Query + Zod

## Scoping & judgment

The brief asks for a focused half-day and values judgment over polish. What I
**deliberately did not build**, and why:

- **No queue/workers** — in-memory job store + polling is sufficient at demo
  scale; a real queue is the first thing I'd add for production volume.
- **No database / auth / accounts** — out of scope for the creative pipeline.
- **No rate-limit or multi-region infra** — the brief explicitly deprioritizes
  infra polish; I spent that budget on failover, consistency, and output quality.

See [`docs/governance/`](docs/governance) for the standards this repo enforces.

## Repository layout

```
server/              Hono API (the deliverable)
web/                 Vite + React demo
packages/contracts/  Zod schemas shared by server + web
docs/                governance + architecture (ADRs)
```
