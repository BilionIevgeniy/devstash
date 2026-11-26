# Runbook: the move to Frankfurt (2026-11-25)

What was done, in the order it was done, with the clicks, the commands, what each step should answer and what went differently. Why it was done this way is in [ADR 0038](../adr/0038-frankfurt-region.md); the numbers are in [performance.md](../performance.md), "The move to Frankfurt". No password or connection string is written here.

The copy script, `scripts/region-move/`, was deleted after the move. It is in the git history: `git show 2d522b6:scripts/region-move/run.ts` (also `database.ts`, `rules.ts`, `rules.test.ts`).

## The result

|                           | Before                                                              | After                                                           |
| ------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| Vercel functions          | `iad1` (Washington)                                                 | `fra1` (Frankfurt), `regions` in `vercel.json`                  |
| Neon project              | `devstash`, `purple-voice-82062641`, AWS `us-east-2` (Ohio)         | `devstash-eu`, `lively-wildflower-46234559`, AWS `eu-central-1` |
| production, direct host   | `ep-twilight-hat-b4ay1zs8.c-6.us-east-2.aws.neon.tech`              | `ep-green-mud-bhzhz461.c-10.eu-central-1.aws.neon.tech`         |
| development, direct host  | `ep-calm-voice-b4zvdl6z.c-6.us-east-2.aws.neon.tech`                | `ep-orange-star-bh3ldo06.c-10.eu-central-1.aws.neon.tech`       |
| development, branch id    | `br-super-sound-b4wxm3u6`                                           | `br-ancient-surf-bhvbcik7`                                      |
| Upstash, R2, Stripe, etc. | not changed (Upstash `devstash-ratelimit` was in Frankfurt already) | not changed                                                     |

The `development` branch of the move (`br-raspy-sound-bh0suynz`, `ep-soft-art-bhqrx5ln`) was gone on 2026-11-26 and every preview failed with P1001; it was created again from `production`, its real users deleted (`npm run db:delete-users`), and the Preview `DATABASE_URL` and `DIRECT_URL` in Vercel replaced. The values above are the new branch.

A pooled host is the direct one with `-pooler` after the endpoint id.

## Words

- **Connection pooling**: a switch in Neon's Connect window. On: the host has `-pooler`, the app uses it (`DATABASE_URL`). Off: the direct host, migrations and the copy use it (`DIRECT_URL`)
- **Freeze**: the database becomes read-only (`default_transaction_read_only = on`), so nothing is written while it is copied
- **Point of no return**: until then a rollback loses nothing; after it users write into the new database

## 1. Look before touching (read only)

1. **Upstash**: console.upstash.com → Redis → `devstash-ratelimit` → the region under the name. It said Frankfurt, `eu-central-1`, so nothing to move
2. **Neon**: old project → the panel on the right → Region, Plan, Storage (33 MB), and the Postgres version: SQL Editor → `SHOW server_version;` → 18.7
3. **Measured the live site** from Germany: the first rows of the table in `performance.md`

## 2. The new Neon project

1. console.neon.tech → **New project**: name `devstash-eu`, the same Postgres version (18), region **AWS Europe Central 1 (Frankfurt)**. A project's region cannot be changed later, and a branch cannot be in another region than its project
2. Two branches: `production` (default) and `development`
3. Noted the ids, which are not secrets:
   - project id: the address, `console.neon.tech/app/projects/<project id>/…`
   - branch id: the branch's page, starts with `br-`
   - endpoint: branch → **Computes**, starts with `ep-`
   - the rest of the host (`c-10.eu-central-1.aws.neon.tech`): **Connect**, the part between `@` and `/`
4. Checked the version of the new project the same way: 18.7

## 3. The code (one pull request, #57)

The hosts in `scripts/neon-endpoints.ts` with the guards' tests, `regions` in `vercel.json`, the Neon ids in `CLAUDE.md`, the copy script, ADR 0038, the privacy notice and the processing record. Merging it is the switch, so it stayed a **draft** until the copy was done.

While it was open, its preview build failed, as planned: the migration guard refuses a build whose variables name another database.

## 4. Rehearsal on development

1. A file `.env.move.development.local` in the project's root (git ignores it, Claude Code may not read it):

   | Line                  | From                                                                                  |
   | --------------------- | ------------------------------------------------------------------------------------- |
   | `SOURCE_URL`          | old project → `development` → Connect, pooling **off**, as it is                      |
   | `TARGET_URL`          | new project → `development` → Connect, pooling **off**, as it is                      |
   | `VERCEL_DATABASE_URL` | new project, pooling **on**, after `?` only `sslmode=verify-full`                     |
   | `VERCEL_DIRECT_URL`   | new project, pooling **off**, after `?` only `sslmode=verify-full&connect_timeout=15` |

2. With `npm run dev` stopped:

   ```bash
   npx tsx scripts/region-move/run.ts development freeze    # two hosts "refuses writes"
   npx tsx scripts/region-move/run.ts development copy      # rows per table, then "Equal: 268 checks"
   npx tsx scripts/region-move/run.ts development urls      # "20 migrations, writable" twice
   npx tsx scripts/region-move/run.ts development unfreeze  # two hosts "accepts writes"
   ```

3. `unfreeze` failed on the pooled host ("still refuses writes"): see "What went wrong". After the compute had been suspended and started again it passed
4. `freeze` once more, with a restart of the compute in between. The old development stays frozen

## 5. Preview on the new development

1. Vercel → **Settings → Environment Variables**, only **Preview**: `DATABASE_URL` = `VERCEL_DATABASE_URL`, `DIRECT_URL` = `VERCEL_DIRECT_URL`, without the quotes. The same two in the local `.env` (there without `connect_timeout`)
2. A push rebuilt the preview; its build passed the guard
3. Region: open the preview → DevTools → Network → `session` → Response Headers → `x-vercel-id` = `fra1::fra1::…`. The first part is the edge, the second the function
4. Sign in as the demo user, star a snippet, reload: it stayed. Reading and writing in the new database

## 6. Preparing the evening

1. `.env.old-production.local`: the **old** production `DATABASE_URL` and `DIRECT_URL`, from Neon's Connect, for a rollback. Vercel does not show a sensitive value again
2. `.env.move.production.local`, the same four lines as in step 4 from the two `production` branches. Check: `twilight-hat` once, `green-mud` three times
3. `npx tsx scripts/region-move/run.ts production urls` → `relation "_prisma_migrations" does not exist`: the address and the password are right and the database is still empty
4. Signed in on the live site and left the tab open: with the rule on, nobody can sign in
5. The pull request: `ci`, `integration` and `e2e` green, `main` not moved, no other pull request open

## 7. The switch

Times in UTC. The site was read-only for about 27 minutes.

| Time           | Step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13:39          | **Firewall on.** Vercel → Firewall → Configure → New Rule, `freeze-move`: **If** Method _is not any of_ `GET`, `HEAD` **OR** Request Path _starts with_ `/api/auth/callback` **OR** Request Path _starts with_ `/api/cron`; **Then Deny** (the form starts with _Log_), no duration, no hostname. Save Rule → Review Changes → **Publish**. Checked from outside: `POST`, `PUT`, `PATCH`, `DELETE`, the callback and the cron answer 403, reads 200. A `vercel.app` address answers 302, Vercel's own sign-in |
| 13:39 to 13:45 | Five minutes' wait for running functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| from 13:45     | **Freeze** the old production: `run.ts production freeze` → both hosts "refuses writes". The plan: restart the old compute (Neon → Computes → `⋮` → Restart compute; grey when it is suspended) and run it again                                                                                                                                                                                                                                                                                              |
|                | **Copy**: `run.ts production copy` → both hosts refuse writes, 13 tables (2 users, 99 items, 28 collections), `Equal: 268 checks`                                                                                                                                                                                                                                                                                                                                                                             |
|                | **Check the addresses**: `run.ts production urls` → `20 migrations, writable` twice                                                                                                                                                                                                                                                                                                                                                                                                                           |
|                | **Variables**: Vercel → Environment Variables, only **Production**: `DATABASE_URL` and `DIRECT_URL` from `.env.move.production.local`, without the quotes. No redeploy                                                                                                                                                                                                                                                                                                                                        |
|                | **Compare again**: `run.ts production verify` → `Equal`, the same hashes: nothing was written since the copy                                                                                                                                                                                                                                                                                                                                                                                                  |
| 13:51          | Pull request #57 merged (`2d522b6`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 13:53          | Production deployed. Reads checked with the rule still on: `x-vercel-id` `fra1::fra1`, `/reset-password` with an unknown token answers from the database, the dashboard in the open tab, no error in Sentry                                                                                                                                                                                                                                                                                                   |
| 14:03          | **Point of no return.** Old project `devstash` → `production` → **Postgres database → Roles** → `neondb_owner` → `⋮` → **Reset password**. The old deployment can read nothing any more. The site still reads: checked                                                                                                                                                                                                                                                                                        |
| 14:06          | **Firewall off**: the rule deleted, Review Changes → Publish. Checked: `POST` reaches the app again                                                                                                                                                                                                                                                                                                                                                                                                           |

## 8. After it

1. On the live site: a snippet created and still there after a reload, an image uploaded and opened. No error in Sentry
2. Delete `.env.move.development.local`, `.env.move.production.local` and `.env.old-production.local`
3. A second pull request: this runbook, the numbers after the move, the script deleted
4. On 2026-12-02: delete the old Neon project `devstash` (Settings → Delete), see `context/todo-before-live.md`

## What went wrong, and why

- **The freeze did not go through the pooler.** PgBouncer remembers the first value of `default_transaction_read_only` it saw and sets it on every pooled session. With a warm pooler the app would have kept writing through the freeze; after `unfreeze` it stayed read-only. A local PgBouncer showed both; restarting it cured both. Since then `freeze` and `copy` prove a refused write through **both** hosts
- **The first version of the copy failed** on `pg_restore` (`schema "public" already exists`), because of `pg_dump --schema=public`. Found on two throwaway local databases
- **The comparison reported false differences**: it compared `attnum`, and a dropped column leaves a gap that a restore closes. It compares the position now
- **GitGuardian** reported a made-up password in a test. Not a leak; put together from two parts now
- **A redeploy of the wrong deployment**: it was a commit of `main`, whose guard knows only the old endpoint (`Migration refused`). Nothing was migrated. The deployment of the feature's branch was the right one
- **Sign-in on the preview failed with `serverError`**: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` were not set for Preview, and the rate limit fails closed. Not caused by the move; found through Sentry's stack. They are in the README now
- **`urls` hung after its expected error** and ended with `Connection terminated unexpectedly` when Neon suspended the empty database: it did not close its connection. Harmless, and the script is gone
