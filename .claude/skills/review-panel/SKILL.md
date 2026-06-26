---
name: review-panel
description: Use after finishing a logical chunk of work or before opening or merging a PR. Dispatches a panel of specialist reviewer subagents in parallel over the same diff, synthesizes their findings, and drives each to resolution before merge.
---

# Review Panel

Run an adversarial, multi-perspective review on a diff or pull request. AI-written
code earns the same scrutiny as anything else, and the value is the harness, not
blind trust in the output.

## When to use

- Before opening or merging a PR.
- After finishing a logical chunk of work that you want a second (and third) opinion on.
- Scale the panel to the change: a few lenses for a small diff, the full set for a
  substantial one.

## The panel

Dispatch these in parallel, each scoped to ONE lens, each reviewing the same diff.
Give every reviewer the diff range, the invariants that matter, and an instruction
to report only real issues as `[severity] file:line — problem — concrete fix`.

1. **Correctness** — logic, edge cases, and regressions against the plan.
2. **Types and architecture** — boundaries, the dependency rule, and type design.
3. **Security** — input validation, secret handling, and the failure-reason invariant.
4. **Accessibility** — keyboard paths, screen readers, and colour contrast.
5. **Tests** — coverage of real behaviour, not implementation detail.
6. **Performance and DX** — hot paths, bundle weight, and how the code reads.

## Process

1. Compute the diff (for example `git diff main...HEAD`).
2. Spawn one reviewer per lens, in parallel, review-only (no edits).
3. Synthesize: dedupe across reviewers, rank by severity, and drop nits already
   enforced by lint and formatting.
4. Address each real finding, or record why it is rejected. The panel advises, it
   does not decide.
5. Re-run the relevant lens if a fix is non-trivial.

## Output

A single prioritized list of findings with severity, location, and a fix, ending
with an overall verdict. Keep it to things that are real and actionable.
