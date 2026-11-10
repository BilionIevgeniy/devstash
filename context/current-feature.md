# Current Feature: CI and safe migrations

## Status

In Progress

## Goals

- `package.json` scripts: `typecheck` (`next typegen && tsc --noEmit`, exact command checked against the installed Next docs), `build` = `prisma generate && node scripts/copy-monaco.mjs && next build` with no `prisma migrate deploy`, and `db:migrate:deploy` = `prisma migrate deploy`
- `npm run build` no longer touches any database
- GitHub Actions `.github/workflows/ci.yml` on `pull_request` and on `push` to `main`: Node from `.nvmrc`, `npm ci` with the npm cache, then `lint`, `typecheck`, `test`, `build`. A lint error, a type error or a failing test turns the PR check red
- The workflow lists every env var the build and `next typegen` need, and says which are dummies (inline placeholders or GitHub secrets); no real database or vendor secret
- Production migrations run as their own step, once per merge, before the new code serves traffic: Option A (GitHub Actions job with `concurrency: production-migrate`, `PRODUCTION_DIRECT_URL` secret, then a Vercel deploy hook, Git auto-deploy of `main` turned off) or Option B (`vercel-build` = `node scripts/migrate-if-allowed.mjs && npm run build`, migrating only into the environment's own database). The plan review picks one
- Preview builds migrate only their own Neon branch; a preview deployment cannot reach the production database (Neon Vercel integration with `DIRECT_URL` mapped to `DATABASE_URL_UNPOOLED`, or one shared `development` branch for all previews)
- New ADR "How schema changes reach production", including expand/contract for breaking changes (the deprecated `User` Stripe columns as the example)
- Dependabot `.github/dependabot.yml`: npm weekly with grouped minor/patch, plus GitHub Actions
- Branch protection on `main` (CI must pass before merge), set in GitHub settings, with the steps in the README

## Notes

- Why: every Vercel build currently runs `prisma migrate deploy` against `DIRECT_URL` (`package.json`, `prisma.config.ts`), including previews of unmerged branches; if a preview's `DIRECT_URL` points at production, an unmerged migration changes the production schema. There is no CI, so `main` can go red unnoticed
- If a page reads the database at build time, the plan review records it
- An "Ignored Build Step" can only skip a build, it cannot wait for a migration; check the current Vercel setting (e.g. `git.deploymentEnabled` in `vercel.json`) for Option A
- Non-goals: E2E in CI (feature 5), integration tests against Postgres (feature 4), deployment outside Vercel
- Tests: no unit tests. Proof is a PR with a deliberately failing test (red CI), then fixed (green), and the build log of one preview plus the Vercel env settings
- Docs to update: `README.md` ("Scripts" gets `typecheck` and the migrate script; fix the `DATABASE_URL` line and "the build applies pending migrations"), `CLAUDE.md` (commands), `context/coding-standards.md` ("Database": where migrations run; the pre-commit checks now include `npm run typecheck`), new ADR in `docs/adr/`, `docs/architecture.md` (deployment)
- Read first: Prisma "deploy database changes with Prisma Migrate", Neon "Vercel native integration previews", Next.js CLI reference in `node_modules/next/dist/docs/` (`next typegen`, `next build`), GitHub Actions "Building and testing Node.js"
- Handbook: modules 10 (Testing I and CI) and 17 (production and deployment)
- Spec: `context/features/1.ci-and-safe-migrations.md`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
