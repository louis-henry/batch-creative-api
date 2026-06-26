# AI Usage

The brief asks how AI was used. Two layers: AI **in the build** and AI **in the
product**.

## AI in the build (development)

This project was developed with **Claude Code** as a pair engineer, driven by an
explicit, reviewable process rather than ad-hoc prompting:

- **Structured workflow** — idea → design spec → reviewed implementation plan →
  phased execution. Planning artifacts are kept local (not committed) so the repo
  stays clean; each phase ships as its own reviewed PR.
- **Skills / commands** — reusable Claude Code skills for brainstorming, plan
  writing, and code review enforce a consistent process. Project-specific commands
  live in `.claude/`.
- **MCP servers**
  - **context7** — pulls _current_ library/provider docs (Hono, OpenRouter, image
    APIs) so adapters match today's API shapes, not stale training data.
  - **playwright** — drives the demo FE for browser QA of the end-to-end flow.
- **Guardrails for the AI** — [`AGENTS.md`](../../AGENTS.md) and
  [`CLAUDE.md`](../../CLAUDE.md) encode the architecture, code style, and "never
  touch `main`" rules so the agent works inside the same standards as a human.

Principle: AI accelerates the work, but every change passes the same gates
(lint, types, tests, review) and nothing merges unread.

## AI in the product (runtime)

- **Image generation** — product placed in-context using editing-capable models
  (Gemini 2.5 Flash Image primary, OpenAI `gpt-image-1` failover) behind one port.
- **Post copywriting** — an LLM via OpenRouter produces a structured social post
  (title, caption, hashtags) validated against a Zod schema.
- **Consistency** — a style spec is extracted once from the reference images and
  applied across the batch.
- **Optional LLM-as-judge** — scores each output for product fidelity and style
  match, tying failover/retry to _quality_, not just transport errors.

## Why this matters

The hard part of applied AI isn't calling a model — it's making flaky, non-
deterministic providers reliable and consistent. That engineering (the resilience
executor, the consistency mechanism, structured/validated outputs) is the core of
this project.
