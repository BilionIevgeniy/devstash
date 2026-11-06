# Current Feature: Stripe Integration - Phase 1: Core Infrastructure

## Status

In Progress

## Goals

- ADR 0011 written first: supersedes ADR 0005, restates its decision, records `past_due` grace, no `StripeEvent` table, and the `getSessionUser` cost correction
- `stripe` SDK installed and reached only through `src/lib/stripe.ts` (client, event verification, error checks, re-exported types)
- `past_due` grants Pro; `unpaid`, `paused`, `canceled`, `incomplete`, `incomplete_expired` do not
- Free limit rules `withinFreeItemLimit` and `withinFreeCollectionLimit`, and `billingOverviewFor`, in `billing/domain/limits.ts` with corrected tests
- `getBillingOverview` in `billing/queries.ts`, `getStripeCustomerId` in `billing/_internal/queries.ts`
- `planSchema` and `checkoutSessionIdSchema` in `billing/schemas.ts`; the client sends `monthly` or `yearly`, never a price id
- `createCheckoutSession` and `createPortalSession` in `billing/services/checkout.ts`, with tests: an already Pro user cannot start a checkout, and a dead Stripe customer does not block upgrading
- `startCheckout` and `openBillingPortal` in `billing/actions/checkout.ts`; actions read `origin`, services take it as a parameter
- `.env.example` drops `STRIPE_PUBLISHABLE_KEY` and comments the variables that stay
- Docs updated in the same change: `context/architecture-rules.md`, `docs/modules.md`, `docs/architecture.md`, `docs/arc42-lite.md`, `docs/adr/README.md`, and the status line of ADR 0005
- `npm run test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass

## Notes

- Spec: `context/features/stripe-phase-1-spec.md`; the reasons behind each decision are in `docs/stripe-integration-plan.md`
- Nothing changes for users in this phase: no UI, and nothing calls the actions yet
- Prerequisites: Stripe sandbox set up (section 7 of the plan, steps 1 to 5); `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY` in `.env`
- Already built, do not rebuild: the `billing` feature and its `FEATURE_RANKS` row, `Subscription` model and migration, `FREE_ITEM_LIMIT`, `FREE_COLLECTION_LIMIT`, the prices, `isProStatus`, `entitlementsFor`, `getEntitlements`, `ProBadge`
- `User.isPro`, `User.stripeCustomerId`, `User.stripeSubscriptionId` stay, and no code may start reading them; their contract migration in `context/todo.md` is not part of this work
- Do not add `isPro` to the session or the JWT, and do not touch the `jwt` callback
- No `StripeEvent` model, whatever the draft or older docs say
- In ADR 0005 change only the status line: an accepted record is not otherwise edited
- Check the installed SDK's `.d.ts` before relying on an API. Checked for 23.1.0: API version `2026-10-28.endive`, `current_period_end` on subscription items and not on the subscription
- The lint rule `VENDOR_SDKS` also blocks `import type`, so the types `billing` needs are re-exported from `lib/stripe.ts`
- `session.user.email` can be null, so the customer's email is optional
- Keep each function under 50 lines (`findOrCreateCustomer`, `createSession`, `saveCustomer`); past 250 lines the customer helpers move to `billing/_internal/services/stripe-customer.ts`
- A successful redirect reaches the client as a rejected promise; Phase 2's hook handles that with `unstable_rethrow`
- Server Actions cannot be called with curl

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
