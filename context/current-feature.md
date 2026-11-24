# Current Feature: Pre-show hardening

## Status

In Progress

## Goals

- Step 1 `test:` every file the review named gets its colocated test (rate limiter, password reset, registration, email rate limit, token store, the Stripe webhook and register routes, the upload helper and hook, the client side of `ai`, `remove-account`, `list-pages`, the search schemas); each new test fails when its rule is broken, checked once per file by hand and recorded in the PR
- Step 2 `refactor:` the query split, file or folder: `items` and `collections` use only `queries/` and `_internal/queries/`, with shared shapes in `selects.ts` and `collection-rows.ts`; no feature has both `queries.ts` and `queries/`; ADR 0017 amended; `erasableSyntaxOnly` on, so `tsc` refuses an `enum`
- Step 3 `refactor:` logic in its home: `openUserItemOfType` (the item page makes one service call, no business `if`, with a cross-user case), `useAiSuggestion`, `lib/http/retry-after.ts`, `typePagePath`, `ListRowSkeleton`, one page-size constant, the gallery mapper; the dialog-open hook and `finish-email-link.ts` only if they remove the copy without a new abstraction
- Step 4 `fix:` small defects: the unused `recordTypeName`, the `emails` and `marketing` namespaces out of the app layout, an upload timeout, the webhook through `jsonOk`, `Retry-After` on the AI 429, no `AND ()` in the full-text search
- Step 5 `feat(a11y):` a skip link in the app shell, the marketing `SkipLink` moved to `components/common/`, with its line in `a11y.spec.ts`
- Step 6 `feat:` the homepage keeps its buttons visible while the session is unknown: a non-interactive placeholder of the final size, a spinner only after about 300 ms, the session check started when the navbar's module loads, no "Sign in" in the mobile menu for a signed-in user; the rule "No flash of the wrong state" reworded; axe scans and visual baselines pass unchanged
- Step 7 `fix(billing):` the reconciliation reaches every row within a few runs at any volume (a daily offset for pass 1, its own share of the deadline for pass 2, a budget per cron job), with tests of a deadline that runs out
- Step 8 `docs:` the `services/` row of the role table, `docs/modules.md` by entry points, old plans to `docs/archive/`, a README section on how AI was used
- `npm run format:check`, `test`, `typecheck`, `lint`, `build`, `test:integration` and `test:e2e` green

## Notes

- Spec: `context/features/23.pre-show-hardening.md` (the exact files, names and tests per step are in its Scope)
- Prerequisite met: feature 22 merged (PR #53)
- One branch, one PR, one commit per step, in this order: the tests land before the code they protect is refactored, and the behaviour changes (6, 7) are commits of their own
- Settled in the review of 2026-11-24, not reopened: no `mutations` files, types stay where they are, reads that sign R2 URLs or compose another feature's data stay in `services/`, no redirect from `/` and `/de` for signed-in users, no hint cookie with an inline script
- Non-goals: a homepage redirect, a hint cookie, `mutations` files, a types file per source file, a `reconciledAt` migration, new features
- Refactors (2, 3) keep behaviour and exports; only paths change
- Docs: ADR 0017 (amendment), `context/architecture-rules.md` (services row, hook list), `context/coding-standards.md` (TypeScript, UI/UX, Shared building blocks), `docs/modules.md`, `docs/architecture.md` where it names moved paths, README
- Read first: ADR 0009, ADR 0017, `context/coding-standards.md` ("Testing", "UI/UX", "React patterns"), the installed Next docs on project structure and authentication; https://www.nngroup.com/articles/response-times-3-important-limits/; https://www.w3.org/WAI/ARIA/apg/patterns/link/

## Model

- Plan: opus (row 1: billing behaviour in step 7; also a changed UI rule)
- Implementation: sonnet for steps 1–5 and 8 (row 2: a service and paths inside existing modules), opus for steps 6 and 7 (row 1: billing; step 6 changes a UI rule and the timing of the session check)
- architecture-reviewer: opus (row 1; the structure was settled on 2026-11-24, so a short pass over the plan)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
