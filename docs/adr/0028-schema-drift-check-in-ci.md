# 0028. CI fails on a schema change without its migration

- Status: accepted
- Date: 2026-11-17
- Amends: [0013](0013-how-schema-changes-reach-production.md) (its "Not covered yet"). That record stays as it is; this one says what changed.

## Context

ADR 0013 moved migrations into `npm run vercel-build`, so a merge to `main` migrates production before the build. It left one gap open: a change to `prisma/schema.prisma` without its migration. `prisma generate` builds the client from the schema, so typecheck, the tests and the build pass; `migrate deploy` finds nothing to apply; production then fails on a column the client selects and the database does not have. 0013 planned the check for when CI got a Postgres service; the `integration` job has one now.

The command 0013 named (`prisma migrate diff --from-migrations … --to-schema …` with a shadow database) no longer fits: Prisma 7 reads the datasource from `prisma.config.ts`, which defines no shadow database.

## Options

1. **`--from-migrations` with a shadow database.** Add `shadowDatabaseUrl` to `prisma.config.ts` and a second database to the job. One more setting that every environment reads, for a check that only CI runs.
2. **Apply the migrations to the job's empty Postgres, then compare it with the schema.** `prisma migrate deploy` on the test database, then `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`, with the test database handed to Prisma as `DIRECT_URL`. Exit code 2 on any difference.
3. **Compare the newest migration's timestamp with the schema file's history.** Cheap, but it guesses: a migration can be added in the same PR for a different change.

## Decision

Option 2, as `npm run db:check-migrations` (`scripts/check-migrations.ts`). It refuses any database that `requireTestDatabase` does not allow, applies the migrations through `migrateTestDatabase`, runs the diff with the test URL set explicitly (`prisma.config.ts` loads `.env`, whose `DIRECT_URL` is the Neon development branch, and dotenv never overrides a variable that is set) and passes Prisma's exit code on. The `integration` job runs it before the tests; locally it reads `TEST_DATABASE_URL` from `.env.test`, like `db:seed-test`.

The check catches both directions: a schema change without a migration, and a hand-written migration the schema does not describe. What Prisma does not model (the CHECK constraint, `pg_trgm`, the search triggers) is invisible to the diff on both sides, so it cannot raise a false alarm.

## Consequences

- `integration` is already a required check on `main`, so a schema change without its migration cannot be merged.
- Proved on 2026-11-17: a field added to `model Item` without a migration made the script exit 2 locally and the `integration` job fail on a throwaway PR (linked in the PR of feature 16); with the schema restored it exits 0.
- A migration that runs but leaves data wrong is still not covered; the integration and e2e tests run on the migrated schema, which covers what they exercise.
