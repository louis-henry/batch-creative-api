# Git Workflow

## Branching

- `main` is protected: no direct pushes, PR-only, CI must pass, squash merge.
  Enforced locally by a `pre-push` hook that blocks direct pushes to `main`;
  GitHub-side branch protection is enabled once the repo is public.
- Feature work happens on `feat/<phase-or-topic>` branches cut from `main`.
- One phase → one branch → one PR.

## Commits

- **Conventional Commits**, enforced by commitlint on `commit-msg`.
  - `type(scope?): summary`, types: `feat fix docs test refactor chore ci build perf`.
- Imperative mood, summarize the **why** not the what:
  `feat: fail over to secondary image provider on retry exhaustion`.
- One logical change per commit. Keep commits small and individually green.
- Never commit `.env`, secrets, generated artifacts, or `notes/`.

## Pull requests

- Use `.github/PULL_REQUEST_TEMPLATE.md`.
- The PR description states what/why, the phase, and any trade-offs or scope cuts.
- Self-review the diff before requesting review: does every line trace to the task?

## Hooks (Husky)

| Hook       | Runs                                                    |
| ---------- | ------------------------------------------------------- |
| pre-commit | `lint-staged` (eslint --fix + prettier on staged files) |
| commit-msg | `commitlint`                                            |
| pre-push   | `pnpm typecheck && pnpm test`                           |
