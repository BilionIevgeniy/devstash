# Current Feature: Security, auth and data retention (17)

## Status

In Progress

## Goals

- A. Auth hardening
  - A password over 72 bytes (not characters) is refused; a 72-byte one accepted, multi-byte input tested
  - Rate-limit identifiers are an HMAC with `RATE_LIMIT_HASH_KEY`, not a plain SHA-256 (resets every counter once: say so in the PR)
  - Resend verification answers success for every address during a send failure (logged), like `requestPasswordResetLink`
  - Deleting a GitHub-only account needs an emailed confirmation link; the plan decides the case of an unverified or missing GitHub email
  - An email link (password reset, email verification) finished while signed in as another account shows a page that says it is done and offers to switch accounts
- B. Schema contract, step one
  - `@ignore` on `User.isPro`, `User.stripeCustomerId`, `User.stripeSubscriptionId`, `Item.fileUrl` (no migration; `db:check-migrations` stays green); the drop is feature 18
  - A data migration nulls `access_token`, `refresh_token`, `id_token` of `Account`; the revoke loop in `deleteVerifiedUserRows`, `getGitHubAccessTokens` and `github-grant.ts` (with their tests) go
- C. Data retention (Vercel cron)
  - One cron dispatcher route under `src/app/api/cron/` behind `CRON_SECRET` (Bearer, constant-time), declared in `vercel.json`, daily (Hobby), each job a service that pages and logs counts and ids only
  - Expired `VerificationToken` rows of an address deleted in the transaction that creates a new one; the rest by the daily job
  - Never-verified registrations removed after N days (N in the plan and the privacy notice) through the `account` delete path
  - Unclaimed R2 uploads under `users/` older than 24 h that no `Item.fileKey` holds are swept daily (service in `items`, R2 list/delete from `files`), idempotent, in batches; the create refuses with an error code when its file is gone

## Notes

- Spec: `context/features/17.security-auth-retention.md`
- Acceptance: 73 bytes refused / 72 accepted; same answer for every address on a resend failure; no GitHub-only delete without the emailed confirmation; `@ignore` deploy live with the columns still in the DB and no `Account` row holding a token; the cron route refuses a call without the secret and each job is idempotent
- Tests: unit (byte check, HMAC id, cron secret check, retention rules in `domain/`); integration with cross-user cases (sweep, purge of unverified users, token cleanup); E2E for the account-switch page; auth-auditor on the diff
- Docs: `docs/architecture.md` (background work, operations, Known risks "Unclaimed uploads" and "Superseded columns"), `docs/modules.md` (`auth`, `items`, `files`, `account`), `docs/privacy/processing-record.md` and both privacy notices, `README.md`, `.env.example`, `docs/audit-results/AUTH_SECURITY_REVIEW.md`, an ADR for the cron dispatcher and retention periods
- The user sets `RATE_LIMIT_HASH_KEY` and `CRON_SECRET` in every Vercel environment
- Non-goals: CSP (22), retention for active accounts, a queue or worker other than Vercel cron

## Model

- Plan: opus (row 1: auth, a Prisma migration, background work)
- Implementation: opus (row 1)
- architecture-reviewer: opus (every row)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
