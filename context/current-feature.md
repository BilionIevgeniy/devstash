# Current Feature: Vitest Setup and First Unit Tests

## Status

In Progress

## Goals

- Set up Vitest for unit tests, following `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`:
  - dev dependency `vitest`; the `@/` alias comes from Vite's native `resolve.tsconfigPaths`, so no plugin; no jsdom, React Testing Library or React plugin yet
  - `@types/node` bumped from `^20` to `^22` because Vitest 5 requires it (and `.nvmrc` is already 22)
  - `vitest.config.mts` with `environment: "node"` and `include: ["src/**/*.test.ts"]`
  - scripts `test` (`vitest run`) and `test:watch` (`vitest`)
  - a smoke test proving the `@/` alias resolves
- ESLint: `*.test.ts` files are exempt from the domain package allowlist, so a colocated `domain/[name].test.ts` can import `vitest`; every other rule stays as it is
- Docs: a short "Testing" section in `context/coding-standards.md` (what is tested where, what is not), and the "no test runner" line in `CLAUDE.md` replaced with the new commands
- Rule: tests must be green and `npm run test` must run before every commit; written into `context/ai-interaction.md` (workflow and commit rule), `CLAUDE.md`, `context/coding-standards.md`, `docs/architecture.md` and the feature skill's `complete` action
- First test batch, pure code only, no mocks:
  - `auth/domain`: `rate-limits`, `reauth`, `registration`, `verification-token`, `password-reset`
  - `item-types/domain/item-type`, `collections/domain/rank-types-by-usage`
  - `lib/client-ip`, `auth/schemas`
- `tsc`, `npm run lint`, `npm run test` and `npm run build` pass; no behaviour, route, schema or migration change

## Notes

- Tests are colocated as `[name].test.ts` (coding-standards), with explicit `import { describe, it, expect } from "vitest"` so no global types are needed
- Out of scope for this change: service tests with mocked boundaries (need a `server-only` stub in the config), `userId`-in-`where` checks on `queries.ts`, component tests, end-to-end tests, coverage tooling, CI
- Not tested on purpose: layer and import rules and domain purity (ESLint enforces them), thin `actions/`, pages, `components/ui`
- Vitest cannot render async Server Components (Next docs), so page-level coverage belongs to a later end-to-end setup
- Use Node 22 through nvm for every npm, tsc and build command
- Commit, merge and push only on explicit permission; a push to `main` deploys to production

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
