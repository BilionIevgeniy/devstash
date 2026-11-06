# 0012. A webhook write is scoped by the Stripe customer, not by the user

- Status: accepted
- Date: 2026-11-06

## Context

The ownership rule says `userId` is in the `where` of every query and write. A Stripe webhook has no session, and `syncSubscription` also runs for the return from Checkout. What links an event to a row is the Stripe customer id, stored on `Subscription` before Checkout opens.

## Options

1. **Look up the user first, then write by `userId`.** One more read, and the `userId` comes from the same customer id, so it proves nothing more. `metadata.userId` on the session is not on every event.
2. **Write by `stripeCustomerId`, which is unique.** The authority is the verified signature of the event, or a Checkout session checked against the signed-in user.

## Decision

Option 2. `billing/_internal/services/subscription-sync.ts` writes `Subscription` by `stripeCustomerId`, and a non-live status also by `stripeSubscriptionId`. This is the one exception to `userId` in every `where`, and it holds only for a write that follows a signed event or a checked session.

## Consequences

- A reviewer who sees `userId` missing from this write finds the reason here and in the comment on the write
- `confirmCheckoutSession` must check the owner of the session before it syncs, since the id comes from the URL
- A customer that matches no row (a deleted account, a customer that is not ours) writes nothing and is only logged
- No other code may use this exception: a new write reached from a session still takes `userId`
