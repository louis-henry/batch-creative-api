# 2. TypeScript over Python

Date: 2026-06-25

## Status

Accepted

## Context

The role spans backend/web and backend/ML. A natural assumption is "AI work ⇒
Python." For this product, the "AI" is **orchestration of hosted provider APIs**
(image generation, copy, judging) over HTTP, not model training or inference.

## Decision

Build in **TypeScript** end to end.

## Consequences

- The Python ML ecosystem (PyTorch/NumPy) provides no advantage when every model
  call is a hosted HTTP API; all needed SDKs are first-class in TypeScript.
- Node's async model fits the I/O-bound fan-out (N images × providers) well.
- One language across API, shared contracts, and the web demo reduces friction and
  enables a shared Zod schema package.
- Image work is hosted-provider HTTP calls, not local pixel processing, so no
  native imaging stack (e.g. Python's Pillow or Node's `sharp`) is needed.
