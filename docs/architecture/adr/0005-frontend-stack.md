# 5. Frontend stack

Date: 2026-06-26

## Status

Accepted

## Context

Track 02 is a backend deliverable, but the demo UI is what evaluators see first.
It needs to look polished, demonstrate the failover/consistency story, and stay
maintainable, without becoming a second large project.

## Decision

A **Vite + React + TypeScript** single-page app with **Tailwind v4** and
**shadcn-style Radix components** (hand-authored Button/Slider/Switch/HoverCard).
State is split: **Zustand** for client state (selected files, knobs,
current job id) and **TanStack Query** for server state (polling the job).
**Framer Motion** adds restrained animation, **sonner** handles toasts, and the
**`@app/contracts`** package shares Zod schemas with the API so the two never drift.

## Consequences

- Clear separation of concerns: server truth lives in Query, client truth in
  Zustand, and a pure `deriveItems` projection joins them at render time, no
  duplicated source of truth.
- Radix primitives provide correct roles, keyboard operation, and focus handling,
  so accessibility is mostly free; the app targets WCAG 2.1 AA.
- One polling abstraction (`useJob`) that stops at the terminal `done` state (and
  on error), keyed by job id so a new run never shows stale results.
- Tailwind v4's CSS-first theming keeps the design tokens in one place.
- Downloads fetch-to-blob rather than relying on `<a download>`, which is ignored
  cross-origin (the API serves images from a different origin).
