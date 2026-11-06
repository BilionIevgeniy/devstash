# Stripe Integration - Phase 1: Core Infrastructure

> The reasons behind each decision are in [docs/stripe-integration-plan.md](../../docs/stripe-integration-plan.md). This spec replaces `featuresDRAFT/stripe-phase-1-spec.md`.

## Overview

Add the Stripe SDK, the Free limit rules, the billing overview, and the checkout and portal actions. Record the two decisions that change ADR 0005. Nothing changes for users in this phase: there is no UI, and nothing calls the actions yet.

## Already built

Do not rebuild these: the `billing` feature and its `FEATURE_RANKS` row, the `Subscription` model and migration, `FREE_ITEM_LIMIT`, `FREE_COLLECTION_LIMIT`, the prices, `isProStatus`, `entitlementsFor`, `getEntitlements`, and `ProBadge`.

`User.isPro`, `User.stripeCustomerId` and `User.stripeSubscriptionId` stay. Their contract migration in `context/todo.md` is not part of this work, and no code may start reading them.

## Prerequisites

- Stripe sandbox set up: section 7 of the plan, steps 1 to 5
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY` in `.env`

## Requirements

- Write ADR 0011 first
- `past_due` grants Pro
- Stripe is reached only through `src/lib/stripe.ts`
- The client sends `monthly` or `yearly`, never a price id
- A user who is already Pro cannot start a checkout
- A dead Stripe customer does not block upgrading
- Services take `origin` as a parameter; actions read it

## Implementation

### 1. ADR 0011

`docs/adr/0011-past-due-grace-and-no-event-table.md`, status accepted, superseding ADR 0005. In ADR 0005 change only the status line, and update the table in `docs/adr/README.md`. An accepted record is not edited otherwise.

It records:

- ADR 0005's decision, restated in full so it does not live only in a superseded record: entitlements come from the database, `billing` owns `Subscription`, the plan is read through `getEntitlements`, and it is not put in the JWT or the session. Keep its reasons (section 1 of the plan)
- `past_due` grants Pro. The principle: Pro lasts while Stripe is still trying to collect, and ends once it has stopped, so `unpaid` and `paused` stay non-Pro. The window is 8 tries in 2 weeks, then cancel, set in the Dashboard. **Risk:** if the Dashboard keeps subscriptions `past_due` after the last retry, Pro never ends without payment
- There is no `StripeEvent` table. Webhooks save the current state fetched from Stripe, so the write is idempotent without an event record. A side effect that must run once does not bring it back: it claims a business fact on the row inside the sync transaction (`updateMany` where `welcomedAt` is null, sent only when `count === 1`), because one change can produce two events and `confirmCheckoutSession` syncs with none
- Correction: `getSessionUser` is cached, so `auth()` runs about once per request. The cost argument in ADR 0005 is weaker than stated. Ownership, and services needing the plan without a session, are the reasons that hold

### 2. Install the SDK

```bash
npm install stripe@23.1.0
```

Check the installed version's `.d.ts` before relying on an API. Checked for 23.1.0: API version `2026-10-28.endive`, `current_period_end` on subscription items and not on the subscription.

`VENDOR_SDKS` in `eslint.config.mjs` needs an anchored regex first: the bare pattern `stripe` also matches our own `@/lib/stripe`.

### 3. `src/lib/stripe.ts`

The only file that imports `stripe`. The lint rule `VENDOR_SDKS` also blocks `import type`, so the types `billing` needs are re-exported here. It holds no product words.

```typescript
import "server-only";

import Stripe from "stripe";

export type StripeEvent = Stripe.Event;
export type StripeSubscription = Stripe.Subscription;

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key);
  return client;
}

// A missing secret throws a plain Error, so the route answers 500 and Stripe
// retries. Only a bad signature is the caller's fault.
export function constructStripeEvent(
  rawBody: string,
  signature: string,
): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

export function isStripeSignatureError(error: unknown): boolean {
  return error instanceof Stripe.errors.StripeSignatureVerificationError;
}

export function isStripeNotFound(
  error: unknown,
): error is Stripe.errors.StripeInvalidRequestError {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

// Stripe answers resource_missing for any id it cannot find, a wrong price id
// too, and only param tells them apart.
export function isStripeCustomerMissing(error: unknown): boolean {
  return isStripeNotFound(error) && error.param === "customer";
}
```

Checked in the sandbox: a missing customer answers `param: "customer"` in Checkout and the portal, a missing price `param: "line_items[0][price]"`.

### 4. `billing/domain/limits.ts`

```typescript
// The Stripe statuses that grant Pro: Pro lasts while Stripe is still trying to
// collect (ADR 0011). The Dashboard cancels the subscription when retries end.
// subscriptionWrite reads this too, so a change here also changes which
// subscription may write the row.
const PRO_STATUSES = ["active", "trialing", "past_due"];

const PAYMENT_ISSUE_STATUS = "past_due";

export function withinFreeItemLimit(itemCount: number): boolean {
  return itemCount < FREE_ITEM_LIMIT;
}

export function withinFreeCollectionLimit(collectionCount: number): boolean {
  return collectionCount < FREE_COLLECTION_LIMIT;
}

export function billingOverviewFor(
  subscription: { status: string; stripeCustomerId: string | null } | null,
): BillingOverview {
  return {
    ...entitlementsFor(subscription?.status ?? null),
    hasBillingAccount: Boolean(subscription?.stripeCustomerId),
    paymentIssue: subscription?.status === PAYMENT_ISSUE_STATUS,
  };
}
```

The limit functions take no `isPro`: a Pro user skips the count and the lock, so the service would only ever pass `false`.

`BillingOverview` goes in the new `billing/types.ts`, as `{ isPro: boolean; hasBillingAccount: boolean; paymentIssue: boolean }`.

### 5. `billing/domain/limits.test.ts`

The tests pin the old rule, so correct them on purpose:

- `past_due` moves to the statuses that grant Pro, and `isProStatus("past_due")` becomes `true`
- `canceled`, `incomplete`, `incomplete_expired`, `unpaid`, `paused` do not grant Pro
- `withinFreeItemLimit` at 49 and 50, `withinFreeCollectionLimit` at 2 and 3
- `billingOverviewFor`: no row; the demo row (active, no customer); `past_due` sets `paymentIssue`

### 6. Reads

`billing/queries.ts`:

```typescript
export const getBillingOverview = cache(
  async (userId: string): Promise<BillingOverview> => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true, stripeCustomerId: true },
    });
    return billingOverviewFor(subscription);
  },
);
```

`billing/_internal/queries.ts`: `getStripeCustomerId(userId)`, for the services of this feature only.

### 7. `billing/schemas.ts`

```typescript
export const planSchema = z.enum(["monthly", "yearly"]);
export type Plan = z.infer<typeof planSchema>;

export const checkoutSessionIdSchema = z.string().startsWith("cs_").max(255);
```

### 8. `billing/services/checkout.ts`

```typescript
import "server-only";

const ALREADY_PRO = "You are already on the Pro plan.";
const NO_BILLING_ACCOUNT = "No billing account was found.";

export interface RedirectResult extends OperationResult {
  data: { url: string } | null;
}

function priceIdFor(plan: Plan): string {
  const id =
    plan === "monthly"
      ? process.env.STRIPE_PRICE_ID_MONTHLY
      : process.env.STRIPE_PRICE_ID_YEARLY;
  if (!id) throw new Error(`The Stripe price for ${plan} is not set`);
  return id;
}
```

`createCheckoutSession(user: { id: string; email?: string | null }, plan: Plan, origin: string): Promise<RedirectResult>`:

1. Refuse if `getEntitlements(user.id)` says Pro, then read `priceIdFor(plan)`, so a missing price leaves nothing behind
2. Read `getStripeCustomerId`. If there is none, create the customer with `{ idempotencyKey: "customer-<userId>" }` and `metadata.userId`, then save it
3. Create the session:
   - `mode: "subscription"`, `customer`, one line item with `priceIdFor(plan)`
   - `metadata: { userId }`
   - `success_url: <origin>/settings?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: <origin>/settings`
4. If step 3 fails with `isStripeCustomerMissing`, the stored customer is dead: create a new customer **without** an idempotency key, save it over the dead id, and create the session once more. Any other error, a missing price included, or a second failure, throws

Saving the customer:

```typescript
// The row exists before Checkout, so the webhook finds it by customer id. The
// update writes only the customer: the status belongs to the sync.
await prisma.subscription.upsert({
  where: { userId },
  create: { userId, status: "incomplete", stripeCustomerId },
  update: { stripeCustomerId },
});
```

`createPortalSession(userId: string, origin: string): Promise<RedirectResult>`:

- No customer id: return `NO_BILLING_ACCOUNT`
- Create the session with `return_url: <origin>/settings`
- On `isStripeCustomerMissing`: log it, write nothing and return `NO_BILLING_ACCOUNT`. The webhook finds the row only by the customer id, so clearing it could leave a Pro row that no later event can end

Keep each function under 50 lines: split out `findOrCreateCustomer`, `createCustomer`, `createSession` and `saveCustomer`. If the file passes 250 lines, the customer helpers move to `billing/_internal/services/stripe-customer.ts`.

### 9. `billing/actions/checkout.ts`

```typescript
"use server";

export async function startCheckout(plan: unknown): Promise<ActionResult> {
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const user = await getSessionUser();

  let url: string;
  try {
    const result = await createCheckoutSession(
      user,
      parsed.data,
      getAppOrigin(),
    );
    if (!result.success || !result.data) {
      return failure(result.error ?? GENERIC_ERROR);
    }
    url = result.data.url;
  } catch (error) {
    console.error("Starting the checkout failed:", error);
    return failure(GENERIC_ERROR);
  }

  // Outside the try: redirect() throws.
  redirect(url);
}
```

`openBillingPortal()` has the same shape around `createPortalSession`.

A successful redirect reaches the client as a rejected promise. Phase 2's hook handles that with `unstable_rethrow`.

### 10. `.env.example`

Remove `STRIPE_PUBLISHABLE_KEY`: hosted Checkout needs no Stripe.js. Add a comment on each variable that stays, like the other sections, and note that `STRIPE_WEBHOOK_SECRET` comes from `stripe listen` locally.

### 11. Docs, in the same change

- `context/architecture-rules.md`: the `billing` row no longer lists `StripeEvent`
- `docs/modules.md`: `billing` section and the table row for `StripeEvent`; checkout and portal exist
- `docs/architecture.md`: the webhook row in Operations says the handler saves fetched state, not "idempotent by event id". "Background work" stays as it is, since it is still true
- `docs/arc42-lite.md` line 41: `lib/stripe.ts` exists

## New Files

| File | Purpose |
| ---- | ------- |
| `docs/adr/0011-past-due-grace-and-no-event-table.md` | Supersedes ADR 0005 |
| `src/lib/stripe.ts` | Stripe client, event verification, error checks, types |
| `src/lib/stripe.test.ts` | The error checks against real `Stripe.errors` instances |
| `src/features/billing/schemas.ts` | `planSchema`, `checkoutSessionIdSchema` |
| `src/features/billing/types.ts` | `BillingOverview` |
| `src/features/billing/_internal/queries.ts` | `getStripeCustomerId` |
| `src/features/billing/services/checkout.ts` | Checkout and portal sessions |
| `src/features/billing/services/checkout.test.ts` | See Testing |
| `src/features/billing/actions/checkout.ts` | `startCheckout`, `openBillingPortal` |

## Modified Files

| File | Changes |
| ---- | ------- |
| `src/features/billing/domain/limits.ts`, `limits.test.ts` | `past_due`, limit functions, `billingOverviewFor` |
| `src/features/billing/queries.ts` | `getBillingOverview` |
| `eslint.config.mjs` | `VENDOR_SDKS` as an anchored regex |
| `.env.example` | Remove `STRIPE_PUBLISHABLE_KEY`, add comments |
| `docs/adr/0005-…`, `docs/adr/README.md` | Status only |
| `context/architecture-rules.md`, `docs/modules.md`, `docs/architecture.md`, `docs/arc42-lite.md` | See step 11 |

## Testing

Pure rules in `limits.test.ts` (step 5). `checkout.test.ts` mocks `@/lib/stripe`, `@/lib/prisma` and `getEntitlements`:

- A Pro user is refused and Stripe is not called
- An existing customer is reused, and no customer is created
- A dead customer: a new customer is created without an idempotency key and saved over the dead id, and the session is created again
- A second failure throws
- A missing price leaves the customer alone, and an unset price creates no customer
- The upsert's `update` holds only `stripeCustomerId`
- The portal without a customer returns the error, and a dead customer returns it too and writes nothing

`src/lib/stripe.test.ts` pins `isStripeCustomerMissing` with real `Stripe.errors` instances, since `checkout.test.ts` mocks it.

Server Actions cannot be called with curl. `npm run test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` must pass.

## Notes

- Do not add `isPro` to the session or the JWT, and do not touch the `jwt` callback (section 1 of the plan)
- No `StripeEvent` model, whatever the draft or older docs say
- `session.user.email` can be null, so the customer's email is optional
