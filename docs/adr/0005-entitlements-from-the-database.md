# 0005. Entitlements come from the database, and billing owns its data

- Status: accepted (agreed by the architecture reviewers; the owner approved it on 2026-10-29 on that condition)
- Date: 2026-10-29 (the context was corrected the same day: the first version claimed the course's JWT flag goes stale, which is wrong)

## Context

The course draft puts `isPro` into the NextAuth session and the JWT, and its async `jwt` callback reads the flag from the database each time. Auth.js runs the `jwt` callback on every session read (`node_modules/@auth/core/lib/actions/session.js`), and `src/features/auth/nextauth/auth.ts` already reads the database there for `sessionVersion`. So the draft's flag is accurate after a webhook. It does not go stale.

Today the columns `isPro`, `stripeCustomerId` and `stripeSubscriptionId` sit on `User`; the schema and the first migration are the only places that mention them, and no code reads them.

## Options

1. **Columns on `User`, `isPro` in the JWT, read in the `jwt` callback** (the draft). Accurate and simple, and nearly free if it joins the existing `sessionVersion` read.
2. **Columns on `User`, the plan read from the database where it is needed.** No migration, but `billing` reads a model that `auth` owns, an exception to "a feature reads only its own models".
3. **`billing` owns a `Subscription` table; the three columns leave `User`; the plan is read through `billing`.**

## Decision

Option 3. The reasons are ownership and placement, not freshness:

- `auth` is rank 1 and cannot read a table owned by `billing` (rank 2). With `Subscription` owned by `billing`, option 1 is not possible without an upward dependency
- The plan is read where a limit is checked (`billing/queries.ts` `getEntitlements`, wrapped in `cache()`), not on every `auth()` call, which happens several times per page
- A subscription grows beyond one boolean (status, period end, later seats), and the limits are a pure function of the plan in `billing/domain/limits.ts`
- Server components pass `isPro` down as a prop, so no `SessionProvider` and no session `update()` after an upgrade are needed
- The proxy runs without callbacks and should not touch the database anyway

Details:

- `isPro` is derived from the subscription status (`active` or `trialing`). A user with no row is on the Free plan
- Billing's first migration creates `Subscription` and drops the three columns from `User`. `StripeEvent` (the idempotency record by event id) arrives with the webhook
- This overrides `stripe-phase-1-spec` and `stripe-phase-2-spec`, which were adapted accordingly

## Consequences

- The cost is a second read path: one cached query per request where the plan matters
- The rule "read only your own models" has no exception
- The migration is free today and gets more expensive once paying users exist, which is why it is decided before the first Stripe code
- If the columns had stayed on `User`, option 1 would have been a reasonable choice; keeping them there later would need a new record that supersedes this one
