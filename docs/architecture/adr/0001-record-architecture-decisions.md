# 1. Record architecture decisions

Date: 2026-06-25

## Status

Accepted

## Context

We want the reasoning behind significant choices to be legible to future
developers (and evaluators), not buried in chat logs or commit messages.

## Decision

We use lightweight Architecture Decision Records (ADRs), one Markdown file per
decision, numbered sequentially, kept in `docs/architecture/adr/`. Each records
context, the decision, and its consequences.

## Consequences

- Decisions are discoverable and reviewable in the repo.
- Superseded decisions stay in history with a status change rather than vanishing.
