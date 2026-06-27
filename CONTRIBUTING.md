# Contributing

This repo is built phase by phase. Each phase is a `feat/*` branch → PR → squash
merge into protected `main`. `main` is always green and always deployable.

## Workflow

1. Branch from `main`: `git checkout -b feat/<phase>`.
2. Work in small, test-backed commits.
3. Open a PR using the template. CI must pass.
4. Squash merge. Delete the branch.

## Local checks

The same gates run in CI and in Git hooks:

```bash
pnpm lint        # ESLint (incl. complexity/cognitive-complexity caps)
pnpm format      # Prettier check
pnpm typecheck   # tsc --noEmit across workspaces
pnpm test        # Vitest
pnpm build       # tsc build across workspaces
```

Husky enforces these automatically:

- **pre-commit** → `lint-staged` (eslint --fix + prettier on staged files)
- **commit-msg** → `commitlint` (Conventional Commits)
- **pre-push** → `typecheck` + `test`

## Standards

All standards live in [`docs/governance/`](docs/governance) and are machine-enforced
where possible. AI agents working in this repo: read
[`AGENTS.md`](AGENTS.md) first.
