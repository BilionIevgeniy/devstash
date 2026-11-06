# Current Feature: Stripe Phase 2 - Webhooks, Feature Gating & UI

## Status

In Progress

## Goals

- Webhooks save the subscription's current state, fetched from Stripe; an older read can never commit last
- The end of an old subscription cannot overwrite a newer one
- A Free user cannot pass 50 items or 3 collections, even with parallel requests
- A paid return always ends with a clear message and a clean URL, whether or not the webhook has arrived
- A successful upgrade never shows an error toast
- Deleting an account stops the billing first
- The settings page has a billing section: plan badge, Free usage, Upgrade buttons, Manage Billing, payment warning
- `docs/modules.md`, `docs/architecture.md`, `context/architecture-rules.md` and `context/todo.md` are updated in the same change

## Notes

Spec: `context/features/stripe-phase-2-spec.md`. Reasons behind the decisions: `docs/stripe-integration-plan.md`.

Implementation order (from the spec):

1. `src/lib/advisory-lock.ts`, checked once on the Neon `development` branch through the pg adapter
2. `billing/domain/subscription.ts` (`subscriptionWrite`), tested for every status in the spec's table
3. `billing/_internal/services/subscription-sync.ts`: the Stripe read happens inside the lock
4. Webhook: `billing/services/webhook.ts` and `src/app/api/webhooks/stripe/route.ts`
5. Split `items/services/item.ts` into `create-item.ts` and `_internal/services/item-writes.ts`: a refactor only, its own step, tests green before step 6
6. Free limits in `createUserItem` and `createUserCollection`; `collections` now uses `billing`
7. Return from Checkout: `confirmCheckoutSession` and `confirmCheckout`; read `getBillingOverview` only after the sync, since it is cached per request
8. Billing UI: `useBillingRedirect`, `useCheckoutReturn`, `BillingSection`, `BillingPanel`, `settings/page.tsx`, `settings/loading.tsx`
9. Account deletion: `deleteBillingCustomer`, then the new messages in `delete-account.ts`
10. Docs

Decisions from the plan review, which override the spec:

- Step 9 goes before step 8: the cancel must land with the UI or before it
- `deleteBillingCustomer` returns `void` and uses `updateMany`; one message for a failed first purge: "Your files could not be deleted, so your account was not removed. Any active subscription has been cancelled. Please try again."
- `lib/advisory-lock.ts` exports one transaction options constant (`maxWait` 10s, `timeout` 15s), used by the item limit, the collection limit and the sync
- `confirmCheckout` returns `ActionResult<{ isPro: boolean } | null>`
- `BillingPanel` treats an empty `session_id` as `null`
- The checkout return toast: "We couldn't confirm your payment yet. If you paid, your plan will update shortly."; a second subscription after a failed confirm goes to known risks
- ADR 0012 records that a webhook write is scoped by customer; the docs that state the old rule are updated
- `stripeIdOf` in `billing/domain/subscription.ts` is shared by the webhook and `confirmCheckoutSession`; `isRecordNotFound` also moves to `item-writes.ts`; `createUserItem` gets a private `itemData` in step 6

Constraints:

- Already built, do not add again: the Pro checks on uploads (`presign-upload.ts`, `confirmFileColumns`) and the disabled types in the UI
- No migration in this phase: `StripeEvent` was dropped by ADR 0011
- `PricingSection` does not change here; its list of unbuilt features is a decision for before live mode
- Pro never reads the session: `getEntitlements` reads the row
- `stripe trigger` does not test the sync (its fixtures create their own customers); use it only to see the route answer 200
- Prerequisites: Stripe CLI logged in, `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, the printed secret in `STRIPE_WEBHOOK_SECRET`
- The spec's real database, Stripe test mode and browser checklists cover what mocks cannot prove

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
