# 0013. How schema changes reach production

- Status: accepted
- Date: 2026-11-10

## Context

`npm run build` ran `prisma migrate deploy` against `DIRECT_URL`, so every Vercel build migrated a database, previews of unmerged branches included. A preview whose `DIRECT_URL` pointed at production would change the production schema before review. The Neon project has two branches, `production` and `development`, and no Neon Vercel integration. Vercel deploys every push to `main` to production.

## Options

1. **A GitHub Actions job migrates, then a deploy hook deploys.** A job on `push` to `main` (`concurrency: production-migrate`) runs `prisma migrate deploy` with a `PRODUCTION_DIRECT_URL` secret and then triggers a Vercel deploy hook; Git auto-deploy of `main` is turned off. A second copy of the production credentials lives in GitHub, previews need their own path, and a deploy started from the Vercel dashboard skips the migration.
2. **The Vercel build migrates, behind a guard.** The Build Command is `npm run vercel-build` = `tsx scripts/migrate-if-allowed.ts && npm run build`. The script migrates only when the environment's own database is the target. One place for migrations, credentials stay in Vercel, previews and production share the script.

## Decision

Option 2. `vercel.json` sets `"buildCommand": "npm run vercel-build"`, so the command is in git and not a dashboard default. `npm run build` touches no database: it is what CI and a developer run.

`scripts/migration-guard.ts` decides, `scripts/migrate-if-allowed.ts` does the I/O and logs the decision and the host on every build. The rules, an allowlist on both sides:

- `VERCEL_ENV` is `production` or `preview`; anything else refuses
- `DIRECT_URL` and `DATABASE_URL` are both set, `DIRECT_URL` is the direct endpoint (not `-pooler`), and both name the same Neon endpoint and the same database
- production migrates only the production endpoint, a preview only the development endpoint (both in `scripts/neon-endpoints.ts`)

A refusal fails the build, so a misconfigured preview fails loudly instead of migrating or serving the wrong data. The hosts are not credentials (the development one was already in git); moving a branch to a new endpoint is a one-line change, reviewed like any other.

**Previews share the `development` branch.** Its cost, since a preview migrates on every push, before review:

- a migration from branch A lands on `development`; local `prisma migrate dev` on branch B then sees an applied migration missing from its folder and offers a reset, which wipes the demo users
- a migration edited after its first push is not applied again; the schema and the file differ, and `migrate dev` reports a checksum mismatch
- a migration that fails there (P3009) fails every later preview build until `prisma migrate resolve --rolled-back <name>` clears it

So: a pushed migration is never edited, a fix is a new migration, and a branch per preview (Neon Vercel integration, with `DIRECT_URL` mapped to `DATABASE_URL_UNPOOLED`) is the upgrade when the first case hurts (`context/todo.md`).

**Every migration is backward compatible with the deployment that is live** (expand/contract). Old code runs on the new schema in three cases: while the production build runs after its migration, when the migration succeeds and the build fails, and after an Instant Rollback in Vercel, which re-aliases an old deployment and never undoes a migration. A breaking change ships in two deploys: expand (add the new columns, write both, read the new ones), then contract (drop the old ones) only after a deploy in which nothing reads them has been live and no rollback before it is wanted. The example: `Subscription` replaced `User.isPro`, `User.stripeCustomerId` and `User.stripeSubscriptionId`, and `Item.fileKey` replaced `Item.fileUrl`; the old columns stay until their contract migration, because Prisma selects every scalar column by name and the NextAuth adapter reads `User` without a `select`.

## Consequences

- A migration runs once per production build, before that deployment serves traffic; a redeploy runs it again, which applies nothing
- A preview cannot migrate or read production: its build refuses unless both URLs name the development endpoint
- CI runs `npm run build` with dummy URLs and never connects to a database
- A preview's build log shows the guard's line (`Migrating the preview database at …`), which is how the setup is checked
- Moving production to a new Neon endpoint fails the first build until `PROD_DATABASE_HOST` is changed
- Not covered yet: a change to `schema.prisma` without its migration. CI and the build pass, `migrate deploy` applies nothing, and production fails on the missing column. The check (`prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --exit-code`, with a Postgres service as the shadow database) comes with Postgres in CI (`context/todo.md`)
