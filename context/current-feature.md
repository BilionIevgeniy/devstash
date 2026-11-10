# Current Feature: CI and safe migrations

## Status

In Progress

## Goals

- `package.json` scripts: `typecheck` (`next typegen && tsc --noEmit`, exact command checked against the installed Next docs), `build` = `prisma generate && node scripts/copy-monaco.mjs && next build` with no `prisma migrate deploy`, and `db:migrate:deploy` = `prisma migrate deploy`
- `npm run build` no longer touches any database
- GitHub Actions `.github/workflows/ci.yml` on `pull_request` and on `push` to `main`: Node from `.nvmrc`, `npm ci` with the npm cache, then `lint`, `typecheck`, `test`, `build`. A lint error, a type error or a failing test turns the PR check red
- The workflow lists every env var the build and `next typegen` need, and says which are dummies (inline placeholders or GitHub secrets); no real database or vendor secret
- Production migrations run as their own step, once per production build, before the new code serves traffic. Option B was chosen (ADR 0013): `vercel.json` sets the Build Command to `npm run vercel-build` = `tsx scripts/migrate-if-allowed.ts && npm run build`; `scripts/migration-guard.ts` lets production migrate only the production Neon endpoint and a preview only the development one (hosts in `scripts/neon-endpoints.ts`), and fails the build otherwise
- Preview builds migrate only the shared `development` Neon branch; a preview deployment cannot reach the production database. A branch per preview (Neon Vercel integration) is in `context/todo.md`
- New ADR "How schema changes reach production", including expand/contract for breaking changes (the deprecated `User` Stripe columns as the example)
- Dependabot `.github/dependabot.yml`: npm weekly with grouped minor/patch, plus GitHub Actions
- Branch protection on `main` (CI must pass before merge), set in GitHub settings, with the steps in the README

## Notes

- Why: every Vercel build currently runs `prisma migrate deploy` against `DIRECT_URL` (`package.json`, `prisma.config.ts`), including previews of unmerged branches; if a preview's `DIRECT_URL` points at production, an unmerged migration changes the production schema. There is no CI, so `main` can go red unnoticed
- No page reads the database at build time: the build passes with dummy `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` and `APP_URL` and no `.env` (checked locally and in CI)
- Non-goals: E2E in CI (feature 5), integration tests against Postgres (feature 4), deployment outside Vercel. The check for a schema change without its migration waits for Postgres in CI (`context/todo.md`)
- Tests: the guard's rules are pure and tested (`scripts/migration-guard.test.ts`). Proof on PR #4: CI green, red with a deliberately failing test, green after its revert; the preview build passed through the guard
- Docs to update: `README.md` ("Scripts" gets `typecheck` and the migrate script; fix the `DATABASE_URL` line and "the build applies pending migrations"), `CLAUDE.md` (commands), `context/coding-standards.md` ("Database": where migrations run; the pre-commit checks now include `npm run typecheck`), new ADR in `docs/adr/`, `docs/architecture.md` (deployment)
- Read first: Prisma "deploy database changes with Prisma Migrate", Neon "Vercel native integration previews", Next.js CLI reference in `node_modules/next/dist/docs/` (`next typegen`, `next build`), GitHub Actions "Building and testing Node.js"
- Handbook: modules 10 (Testing I and CI) and 17 (production and deployment)
- Spec: `context/features/1.ci-and-safe-migrations.md`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
