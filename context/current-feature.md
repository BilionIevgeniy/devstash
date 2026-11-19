# Current Feature: CSP and Cache Components

## Status

Not Started

## Goals

- CSP (first): an ADR "Content-Security-Policy" that says what a static-compatible policy (`script-src 'self' 'unsafe-inline'`, no nonces) protects and what not; a full policy (`connect-src`, `img-src`, `worker-src`, `font-src`, `style-src` for Monaco, R2, the Sentry EU ingest, GitHub avatars, the vitals route); Report-Only first, enforced once the E2E suite is green with it; no `form-action` without a test of the GitHub sign-in
- Uncaught server errors no longer reach the log with their message (a Prisma error quotes its arguments)
- An E2E egress spec: a local ingest, a test-build DSN, throw routes only in the test build, bodies without token, email or title, one event per error, nothing from an idle page, and Sentry not blocked by `connect-src`
- Cache Components: an ADR "Caching strategy" with what is cached, what stays per request and the invalidation matrix per Server Action (custom types, entitlements from the webhook and the reconciliation, consent never cached)
- `cacheComponents` (and `partialPrefetching` if the installed version has it) on, `force-dynamic` gone, dynamic reads inside `<Suspense>`, `'use cache'` with `cacheLife`/`cacheTag` on the chosen reads keyed by `userId` (and locale), never calling the session or cookies inside
- Invalidation: `updateTag` in Server Actions where the user must see their own change, `revalidateTag` in the webhook and the cron, `refresh()` where no cached data changed
- `ensureStatic = "navigation"` (if the installed version has it) on `/`, `/de` and the legal pages; they stay `○`
- `<Activity>`: `useUnsavedChanges`, dialogs and effects checked for routes kept hidden but mounted
- Screenshot baselines updated only after their diff is reviewed
- A user never sees another user's cached data: an integration test and an E2E with two users
- Measurements in `docs/performance.md`: TTFB and LCP before and after, queries per page, production database latency (pool change only if the numbers show a problem), the 500-row `/favorites` profile (virtualize only if it shows one)

## Notes

- Spec: `context/features/22.csp-and-cache-components.md`
- Prerequisite met: feature 21 merged (PR #49)
- Non-goals: a remote cache handler (Redis), caching AI responses or file URLs, nonces, a CSP report service
- Docs: the two ADRs, `docs/architecture.md`, `context/coding-standards.md` (cache rules), `docs/performance.md`, the `next.config.ts` comment, ADR 0016 addendum (the egress check is automated)
- Read first: the installed Next docs on CSP, `cacheComponents`, the migration guide, `'use cache'`, `cacheLife`, `cacheTag`, `updateTag`, `refresh`; https://nextjs.org/blog/next-16-4; https://react.dev/reference/react/Activity; `docs/adr/0016-error-monitoring-with-sentry.md`

## Model

- Plan: opus (row 1: a different data flow, headers on every route)
- Implementation: opus (row 1)
- architecture-reviewer: opus (row 1)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
