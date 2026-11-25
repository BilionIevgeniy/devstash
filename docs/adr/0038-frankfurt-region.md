# 0038. Functions and database in Frankfurt

- Status: accepted
- Date: 2026-11-25

## Context

The functions ran in Vercel's default `iad1` (Washington) and Neon in `us-east-2` (Ohio); the users are in Germany. Every request that reaches a function paid the Atlantic once, about 100 ms, before any database read (`docs/performance.md`, "The move to Frankfurt"). The edge already answers from `fra1`: the static pages, the prerendered shells and the redirect of `src/proxy.ts`. None of them shortens the way to a function. Upstash is in AWS `eu-central-1`, so each rate limit crossed the Atlantic as well.

A second reason: accounts and content of users in Germany were stored in the USA.

## Options

1. **Stay.** Nothing to move, about 100 ms on every dynamic request.
2. **Only the functions to `fra1`.** The Atlantic lies between the function and the database instead, once per query. Worse: a page makes several.
3. **Both, together.** A Neon project's region is fixed when it is created and a branch cannot be in another region, so this is a new project and a copy of the data.

## Decision

Option 3: `"regions": ["fra1"]` in `vercel.json` (previews too) and the Neon project `devstash-eu` in `aws-eu-central-1`, with `production` and `development` branches. One release switches both. The one host list, `scripts/neon-endpoints.ts`, names the new endpoints; the migration guard (ADR 0013) is an allowlist, so a build with the old variables is refused.

This answers the sentence of [ADR 0014](0014-launch-mode.md) that regions are documented and not changed, and the one of [ADR 0037](0037-caching-strategy.md) that production runs in `iad1`.

### How the data moves

Writes stop for the length of one copy. Logical replication would shorten that to seconds, but the database has about 10 MB and a handful of users; its setup and its own failure modes cost more than a few minutes of read-only.

Two locks, because each covers what the other cannot:

- **A Vercel WAF rule** denies everything but `GET` and `HEAD`, and the paths `/api/auth/callback` (the GitHub sign-in writes on `GET`) and `/api/cron`. Without it a flow that acts outside the database before it writes would do half its work: deleting a file item removes the R2 object first, deleting an account the Stripe customer first, the § 312k cancellation changes Stripe first. It has no host condition (the production deployment has other addresses) and no persistent action (that would block a visitor's reads too)
- **The old database becomes read-only** (`ALTER DATABASE … SET default_transaction_read_only = on`, then every open session is ended, since the default is read at connect, and the compute is restarted). The restart is not optional: PgBouncer remembers the default it saw first and sets it on every pooled session, so without it the app would keep writing through the freeze, or stay read-only after it. The rehearsal on `development` found this, and a local PgBouncer reproduced both directions. `freeze` and `copy` therefore prove a refused write through the direct and the pooled host. This is the guarantee

The copy is `pg_dump` into `pg_restore` in one transaction, without `--create`, which would carry the read-only default over. Then every table is compared by row count and hash, and the schema by its definitions. `scripts/region-move/` does this and refuses any pair of hosts but the old and the new endpoint of the same branch, a source that is not frozen and a target that has tables. It was deleted after the move; git keeps it (`2d522b6`).

### The order

Before: the PR is green and up to date, and no other PR is merged until the end. `development` has been moved the same way; the Preview variables (and Development's, if set) and the local `.env` name the new `development`. The old Production `DATABASE_URL` and `DIRECT_URL` are kept outside Vercel, where a sensitive value cannot be read back, for the rollback. The evening is announced, away from 03:00–04:00 UTC, when the daily cron runs: its upload sweep deletes R2 objects no row holds, so it must never see an empty, partial or stale database. Not done 30 minutes after the freeze: roll back. One production deployment in the window; a second attempt means a rollback first.

1. The owner signs in, then publishes the WAF rule. A `POST` answers 403 on the domain and on a `vercel.app` address. Wait five minutes, so that running functions and their `after()` work end
2. `freeze production` (it may fail on the pooled host), restart the compute of the old `production` in the Neon console, `freeze production` again until both hosts refuse, `copy production` (which ends with `verify`), `urls production`
3. The Production `DATABASE_URL` and `DIRECT_URL` are changed in Vercel; the running deployment keeps its old values. Then the PR is merged: the guard accepts the host, `migrate deploy` applies nothing
4. With the rule still on: `x-vercel-id` names a function in `fra1`, `/reset-password` with an unknown token answers, the owner opens the dashboard, an item and a file. `/api/auth/session` proves nothing, it keeps the token when the read fails
5. **The point of no return:** the password of the old project's `neondb_owner` is reset, so that the previous deployment, which still answers on its own `vercel.app` address, can read nothing and so delete nothing. Then the rule is removed. Nothing has written to the new database until here
6. Sign-in, GitHub sign-in, an item with a file created and deleted; failed Stripe events are resent (the daily reconciliation, ADR 0033, would repair the rest)
7. The `.env.move.*.local` files are deleted

A second PR records the date and the numbers after the move and deletes `scripts/region-move/`. What was done, click by click: [the runbook](../runbooks/frankfurt-move.md).

### Rollback

- **Before 3:** `unfreeze production`, restart the compute, `unfreeze production` again until the direct and the pooled host accept a write, then the rule off
- **3 to 5:** put the old variables back; cancel every queued or running production build, or it would take the domain after the rollback and the two databases would part; if the new deployment is live, Instant Rollback (on Hobby it reaches only the previous deployment, hence one deployment in the window); check which deployment the domain serves; `unfreeze production` with the restart, as above; the rule off last. Then a PR that reverts this one, or `main` would keep the new host and every production build would be refused. Vercel assigns no domain by itself after an Instant Rollback until that is undone
- **After 5:** forward only
- **A second copy** (a failed `verify`, or after a rollback): on the new branch only, before 5, with no deployment live or building on it: `DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT USAGE ON SCHEMA public TO PUBLIC;`, then copy again

## Consequences

- No Instant Rollback to a deployment from before this one, ever. Its variables name the old database, and its cron would act on stale rows: the sweep would delete files uploaded since, the purge of unverified accounts would delete the Stripe customer of a user who verified since. Step 5 enforces it: every read of such a deployment fails before it deletes anything
- The old project stays seven days as a backup and is then deleted. Until then an erased account still exists in that copy; the processing record and the privacy notice say so, and its endpoints stay on the list no test run may empty
- A blocked Server Action gets a 403 and no result: a dialog shows the generic error, the sign-in form the error page. Accepted for a short, announced window
- A file put to R2 just before the rule may have no item; the sweep removes it after a day. Checkout and the customer portal are hosted by Stripe and stay usable; the reconciliation covers them
- Calls to OpenAI, Stripe and Resend start in the EU now, and R2 is reached from there. The vendors stay US companies, so the transfer mechanisms in the processing record do not change
- One region, no failover: Frankfurt down means DevStash down, as Washington was before

## Addendum: the move (2026-11-25)

Done as decided, with the site read-only for about 27 minutes (13:39 to 14:06 UTC): 268 checks equal, twice, the second one after the variables were changed. The `vercel.app` addresses answer 302 to a signed-out request (Vercel's own sign-in), not 403, which closes them too. The old project is deleted on 2026-12-02.
