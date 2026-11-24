# 0030. One daily cron route runs the data retention

- Status: accepted
- Date: 2026-11-18

## Context

GDPR storage limitation applies from the first account (ADR 0014), and some data was kept with no end: unused and expired verification, reset and deletion tokens; registrations whose email was never verified; objects uploaded to R2 that never became an item (the create dialog closed, the file removed, the create failing after the upload). Each needs a job that runs without a request. The project is on Vercel's Hobby plan: a cron job runs at most once a day, at some moment within the scheduled hour, is called with `GET` and `Authorization: Bearer <CRON_SECRET>`, is never retried after a failure and may be delivered twice. Feature 19 adds a Stripe reconciliation of the same kind.

Two rules stood in the way. Every query is scoped by `userId` (rule 4 of "Where does this go"), but a job finds what is due across all users. Every entry point makes one service call (rule 6), but one route runs several jobs.

## Options

1. **One route per job**, each in `vercel.json`. Every job repeats the secret check and the logging; four schedules to keep apart on a plan that runs each once a day anyway.
2. **One dispatcher route** that runs every job in order, each a service of the feature that owns the data, with one secret check, one clock and one log line per job.
3. **A queue or a worker** (Upstash QStash, a separate service). Retries and fan-out, at the cost of a vendor and a second deployment for a few hundred rows a day.

## Decision

Option 2. `src/app/api/cron/daily/route.ts`, scheduled `0 3 * * *` (UTC) in `vercel.json`:

- **The secret:** `isCronRequest` (`lib/http/cron.ts`) compares the header with `Bearer <CRON_SECRET>` in constant time over SHA-256 digests. An unset or short secret (under 16 characters) refuses every call. A refusal is a 401.
- **The jobs:** `runCronJobs` runs them in order, cheapest first: expired tokens (`auth/services/retention.ts`), unclaimed uploads (`items/services/upload-sweep.ts`), stale registrations (`account/services/retention.ts`). A failed job is logged and the next one still runs; any failure makes the answer a 500, which Vercel shows as a failed run. Each job logs its counts under `numbers` and ids only.
- **Time, not counts:** the route sets `maxDuration = 60` (the Hobby limit without Fluid compute, so it holds either way) and passes a deadline 45 seconds after the start. A job that pages checks it before each page and reports `stoppedEarly`, logged as a warning; what is left waits a day. A count cap would not bound the time, and one slow job would starve the next.
- **Idempotent:** a job deletes what is due at its `now`; a second run finds nothing more. No lock is needed for a duplicate delivery.

### The retention periods

| Data                                                          | Kept until                                                                                                                                                                                     | Where the rule lives                                                                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| A verification, reset or deletion token                       | its expiry (24 hours, 1 hour, 1 hour); an expired one is removed when the address asks for a new link and by the daily job                                                                     | `auth/domain/verification-token.ts`, `password-reset.ts`, `account-deletion.ts`; `auth/_internal/services/token-store.ts` |
| A registration with a password whose email was never verified | 7 days (`UNVERIFIED_REGISTRATION_DAYS`), then deleted with its rows through the delete path of `account`                                                                                       | `auth/domain/registration.ts`                                                                                             |
| An object in R2 under `users/` that no `Item.fileKey` holds   | 24 hours (`UNCLAIMED_UPLOAD_HOURS`); a create accepts an upload only up to 23 hours old (`UPLOAD_CLAIM_HOURS`), so the hour between keeps the sweep from deleting an object a create is saving | `files/domain/file-rules.ts`                                                                                              |

A GitHub account has no verified email in Auth.js's eyes either, so the stale-registration rule also requires a password and no linked `Account`. The delete repeats the whole condition inside its transaction, and deletes the address's tokens only when the user row went, so a verification that lands in between keeps the account.

### Exceptions to the rules

- **Rule 4:** a read made only for a job of this route may span users: `auth/queries.ts` `getStaleRegistrationIds`, `items/_internal/queries/upload-sweep.ts` `getHeldFileKeys` (it returns object keys, so `_internal`, ADR 0010), and the delete of `deleteExpiredTokens`. Each finds what is due and the job then acts on each row by its id, through the same checks as a user's own action (`verifyStaleRegistration` builds the deletion proof).
- **Rule 6:** the cron route calls one service per job. It holds no Prisma and no business `if`.

## Consequences

- `CRON_SECRET` is set in every Vercel environment (cron runs only on Production) and changes take effect with the next deploy; the e2e server gets a dummy.
- The sweep has no saved cursor: every run lists `users/` from the start, and held objects never leave the listing. Past about 40,000 objects a run can stop at the deadline before the end, and keys that sort late would never be reached. The `stoppedEarly` warning is the trigger to save the last key (Upstash) and continue from it.
- A job that stops early or fails is seen in the log and the 500, not retried: the next day's run is the retry.
- Feature 19 adds its reconciliation as one more entry in the route's list.

## Amendment (2026-11-24, feature 23)

One deadline for all jobs let a slow one take the time of the ones after it. Each job now has its own `budgetMs` (5, 10, 10 and 20 seconds, 45 in all), and its deadline is the sum of the budgets up to its own, from the start of the run: what a job leaves over goes to the next ones, and one that overruns between two of its checks takes it from them. `purgeStaleRegistrations` checks its deadline before each user, not before each page of 100: one page of deletions could pass the 60 seconds of the function, and no job after it ran.
