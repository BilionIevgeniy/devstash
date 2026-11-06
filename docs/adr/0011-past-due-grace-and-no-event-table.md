# 0011. Pro lasts through `past_due`, and webhooks need no event table

- Status: accepted
- Date: 2026-11-06
- Supersedes: [ADR 0005](0005-entitlements-from-the-database.md)

## Context

[ADR 0005](0005-entitlements-from-the-database.md) decided where the plan comes from, and it still holds. Three of its details do not: it treats `past_due` as Free, it plans a `StripeEvent` table for idempotency, and its cost argument is weaker than it says. An accepted record is not edited, so this one restates its decision in full and replaces it. The analysis is in [docs/stripe-integration-plan.md](../stripe-integration-plan.md).

## Options

For a failed renewal:

1. **`past_due` is Free.** The user loses Pro on the first failed try, while Stripe is still collecting.
2. **`past_due` is Pro, and Pro ends when collection stops.** Up to two weeks of unpaid Pro per failed renewal, recovered if the invoice is paid later.

For idempotent webhooks:

1. **A `StripeEvent` table keyed by event id.** One change can produce two Event objects, which an id does not catch, and `confirmCheckoutSession` syncs with no event at all.
2. **No table: each event only names a subscription, and the handler saves the current state fetched from Stripe.** Delivering an event twice writes the same state.

## Decision

Option 2 in both. The decision of ADR 0005 stays, restated here:

- Entitlements come from the database. `billing` owns `Subscription`, and the plan is read through `billing/queries.ts` `getEntitlements`, wrapped in `cache()`
- The plan is not put in the JWT or the session. Server components pass `isPro` down as a prop, so no `SessionProvider` and no session `update()` are needed, and the proxy does not touch the database
- `isPro` is derived from the subscription status. A user with no row is on the Free plan
- The reasons are ownership and placement. `auth` is rank 1 and cannot read a table owned by `billing`, rank 2. Services need the plan with only a `userId`, and a webhook, an import or the future public API has no session. A subscription grows beyond one boolean, and the limits are a pure function of the plan in `billing/domain/limits.ts`

`past_due` grants Pro:

- The principle: Pro lasts while Stripe is still trying to collect, and ends once it has stopped. The statuses that grant Pro are `active`, `trialing` and `past_due`; `unpaid` and `paused` mean collection has stopped, so they do not
- The window is 8 tries in 2 weeks, then cancel, set in the Stripe Dashboard

There is no `StripeEvent` table:

- Webhooks save the current state fetched from Stripe, so the write is idempotent without an event record
- A side effect that must run once does not bring the table back. It claims a business fact on the row inside the sync transaction (`updateMany` where `welcomedAt` is null, sent only when `count === 1`), because one change can produce two events and `confirmCheckoutSession` syncs with none

A correction to ADR 0005: `getSessionUser` is cached, so `auth()` runs about once per request, not several times per page, and `NewItemButton` reads the plan on most app pages anyway. The two reads cost about the same. Ownership, and services needing the plan without a session, are the reasons that hold.

## Consequences

- **Risk:** the end of Pro depends on a Dashboard setting. If the Dashboard keeps subscriptions `past_due` after the last retry, Pro never ends without payment. That costs revenue and harms no customer, so no code limit is added, but the live setting must be checked by hand
- A wrong setting fails closed for `unpaid` and `paused`, which stay non-Pro
- `subscriptionWrite` reads `isProStatus`, so a change to the grace policy also changes which subscription may write the row
- There is no local record of processed events. An investigation relies on Stripe's event log and the Vercel logs, both with limited retention, so the webhook route logs `event.id` and `event.type` on failure
- The rule "read only your own models" still has no exception
