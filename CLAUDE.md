# CLAUDE.md

Claude Code-specific notes. **Read [AGENTS.md](AGENTS.md) first** — it holds the
architecture, code style, and workflow rules. This file only adds tool-level detail.

## Commands

```bash
pnpm --filter @app/server dev     # run the API (tsx watch)
pnpm --filter @app/web dev        # run the demo FE
pnpm test:watch                   # TDD loop
pnpm lint && pnpm typecheck && pnpm test   # the gate to run before claiming done
```

## Working here

- Follow the phase plan; each phase is one `feat/*` branch and one PR.
- Shared types live in `packages/contracts` — import from `@app/contracts`, never
  duplicate a schema in `server` or `web`.
- When integrating a provider, confirm the request/response shape against current
  docs (use the context7 MCP) before writing the adapter — vendor APIs drift.
- Default to the latest capable Claude models when adding any LLM call.

## Guardrails

- Never push to `main`. Never commit `.env`, keys, or files under `notes/`.
- If a change makes a test fail, fix the cause — do not weaken the test.
