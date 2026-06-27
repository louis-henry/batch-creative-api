# 3. Hono API over a Next.js app

Date: 2026-06-25

## Status

Accepted

## Context

Track 02 is a backend deliverable: a batch API. We considered Next.js (one app,
one Vercel deploy) versus a standalone API plus a small web demo.

## Decision

A **standalone Hono API** as the deliverable, with a separate **Vite + React**
demo, in a pnpm monorepo. The API is deployed as a **long-lived server**
(Railway/Render); the FE deploys as a static site.

## Consequences

- Clean separation: the API is unmistakably the product, not entangled with a web
  framework. Hono is featherweight with strong types and clean middleware.
- A long-lived server runs the asynchronous batch (jobId + poll) naturally.
  Serverless (Next or Hono on Vercel) caps function duration, which would force a
  queue/cron or an SSE rework just to do background batch work, the constraint is
  the runtime, not the framework.
- Two deploys instead of one; acceptable, and the brief deprioritizes infra polish.
- A shared `@app/contracts` package keeps API/FE types in sync (DRY).
