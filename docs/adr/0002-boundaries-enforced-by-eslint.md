# 0002. Boundaries are enforced by ESLint

- Status: accepted
- Date: 2026-10-29

## Context

Rules written in prose drift, and AI-generated code does not read them every time. A boundary that nothing checks is advice. The structure in [ADR 0001](0001-modular-monolith-with-ranked-features.md) only holds if a wrong import fails a command that every change already runs.

## Options

1. **Prose and code review only.** No tooling, but the rules erode.
2. **ESLint zones generated from one rank table.** Runs in `npm run lint` with no new tool.
3. **A separate tool** (`dependency-cruiser`, `eslint-plugin-boundaries`, ArchUnitTS). More expressive, but one more tool to set up. None of them was evaluated against these rules.

## Decision

Option 2. `eslint.config.mjs` builds its zones from one table, `FEATURE_RANKS`, and checks:

- the layer order and the `_internal/` boundary (`import/no-restricted-paths`)
- the direction of the roles inside a feature
- a pure `domain/` (an allowlist: no package import at all)
- no Prisma in actions, components and `app/`; no request APIs in services; vendor SDKs only in `lib`
- import cycles (`import/no-cycle`)

A guard throws when `src/features` and `FEATURE_RANKS` differ, so a new feature cannot be forgotten.

## Consequences

- A wrong import fails the lint, so the structure does not depend on anyone remembering it
- Some rules cannot be checked by lint and stay with the author and the reviewer: `userId` in every `where`, no writes in `queries.ts`, one service call per entry point
- A rule that reads another feature's models (`prisma.<foreign model>`) is planned as a `no-restricted-syntax` selector generated from a model-to-owner map; it must also match transaction clients such as `tx.item`
- The setup depends on `eslint-plugin-import`, see [ADR 0006](0006-eslint-9-and-eslint-plugin-import.md)
