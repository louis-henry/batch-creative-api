# Engineering Standards

These are enforced by ESLint/TypeScript where possible, and by review otherwise.

## Principles

- **SOLID**, applied pragmatically. The two that shape this codebase most:
  - **Single Responsibility** — each file/function does one thing. When a file
    grows past ~300 lines it is doing too much; split it.
  - **Dependency Inversion** — `application` depends on **ports** (interfaces),
    never on concrete vendor SDKs. Adapters implement the ports.
- **DRY, but earned.** Extract on the third real duplication, not the first guess.
  A premature abstraction is worse than three honest copies.
- **YAGNI.** Build for the task in front of you. No speculative configurability.
- **Simple over clever.** Optimize for the next reader.

## Complexity budget (enforced by ESLint)

| Rule                                                  | Limit |
| ----------------------------------------------------- | ----- |
| Cyclomatic complexity (`complexity`)                  | 10    |
| Cognitive complexity (`sonarjs/cognitive-complexity`) | 15    |
| Function length (`max-lines-per-function`)            | 60    |
| File length (`max-lines`)                             | 300   |
| Nesting depth (`max-depth`)                           | 3     |
| Parameters (`max-params`)                             | 4     |

If you hit a limit, the design is telling you to decompose — extract a function,
introduce a type, or invert a dependency. Don't raise the limit.

## TypeScript

- `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
- No `any`. Use `unknown` and narrow. Model invalid states out of existence with
  discriminated unions instead of optional-field soup.
- Public/exported functions have explicit return types.

## Comments

Explain **why**, never **what**. Code says what it does; comments justify
non-obvious decisions, trade-offs, or external constraints. JSDoc on exported
ports and public APIs only. No AI-style line-by-line narration.

## Errors

Handle at boundaries (request validation, provider calls, file I/O). Use typed
errors (`ProviderError`, `ValidationError`, `CompositeError`). Never swallow an
error silently; either handle it meaningfully or let it propagate with context.
