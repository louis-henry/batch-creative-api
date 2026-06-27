# AGENTS.md, operating guide for AI agents (and humans)

This file is the contract for anyone, human or AI, writing code in this repo.
It is intentionally specific so an agent can act correctly without guessing.

## Golden rules

1. **`main` is sacred.** Never commit to it. Work on `feat/*`, open a PR, squash merge.
2. **Verify before you claim.** Run `pnpm lint && pnpm typecheck && pnpm test` and
   read the output before saying anything passes.
3. **Surgical changes.** Touch only what the task needs. Don't refactor adjacent
   code, reformat unrelated files, or add unasked-for features.
4. **No secrets in code or logs, ever.** Keys come from env; outputs never log them.

## Architecture you must respect

Ports & adapters. Dependencies point inward:

```
domain  →  (nothing)          pure logic, no I/O, fully unit-tested
application → domain + ports   orchestration; depends on interfaces, not vendors
adapters → implement ports     provider clients, storage, jobs
interface → wires it together  Hono HTTP layer (thin)
```

- A new external capability = a **port** (interface) in `application`/`domain` +
  an **adapter** in `adapters`. Never call a vendor SDK from `domain`/`application`.
- Keep `interface` thin: validate input, call application, map result to HTTP.

## Code style

- TypeScript strict; no `any` (use `unknown` + narrowing). Prefer `type` imports.
- Small units: functions ≤ ~60 lines, files ≤ ~300, cyclomatic ≤ 10, cognitive ≤ 15.
  These are **enforced by ESLint**, if the linter complains, split the unit.
- Pure functions over stateful ones; inject dependencies, don't reach for globals.
- Error handling at boundaries only (input, provider calls, I/O). Trust types within.
- **Comments explain _why_, never _what_.** No line-by-line narration. JSDoc only on
  exported ports / public APIs. Self-documenting names over comments.

## Testing

Test **behavior, not implementation**. Use fakes (e.g. a configurable fake
provider) over mock-everything. No filler/snapshot tests that assert nothing real.
See [docs/governance/testing.md](docs/governance/testing.md).

## Commits & PRs

- Conventional Commits, imperative, explain **why**: `feat: add provider failover`.
- One logical change per commit. PRs use `.github/PULL_REQUEST_TEMPLATE.md`.

## Before you finish a task

- [ ] `pnpm lint && pnpm format && pnpm typecheck && pnpm test && pnpm build` green
- [ ] New logic is covered by a meaningful test
- [ ] No stray files, secrets, or generated artifacts staged
- [ ] Diff traces directly to the task

See also [CLAUDE.md](CLAUDE.md) for Claude Code-specific notes and
[docs/governance/](docs/governance) for the full standards.
