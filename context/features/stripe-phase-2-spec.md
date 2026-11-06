# Stripe Integration - Phase 2: Webhooks, Feature Gating & UI

> The reasons behind each decision are in [docs/stripe-integration-plan.md](../../docs/stripe-integration-plan.md). This spec replaces `featuresDRAFT/stripe-phase-2-spec.md`.

## Overview

Sync subscriptions from a webhook, enforce the Free limits, build the billing section on the settings page, handle the return from Checkout, and cancel Stripe when an account is deleted.

## Already built

The Pro checks on uploads (`presign-upload.ts`) and on file and image items (`confirmFileColumns`), and the disabled types in the UI. Do not add them again.

## Prerequisites

- Phase 1 complete
- Stripe CLI: `brew install stripe/stripe-cli/stripe`, `stripe login`
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, with the printed secret in `STRIPE_WEBHOOK_SECRET`

## Requirements

- Webhooks save the subscription's current state, fetched from Stripe. An older read can never commit last
- The end of an old subscription cannot overwrite a newer one
- A Free user cannot pass 50 items or 3 collections, even with parallel requests
- A paid return always ends with a clear message and a clean URL, whether or not the webhook has arrived
- A successful upgrade never shows an error toast
- Deleting an account stops the billing first

## Implementation

Follow this order. The `item.ts` split (step 5) is its own step, with tests green, before the limit is added.

### 1. `src/lib/advisory-lock.ts`

```typescript
import "server-only";

import type { Prisma } from "@/generated/prisma/client";

// Held until the transaction ends, and safe through a transaction-mode pooler.
// $executeRaw and not $queryRaw: the function returns void.
export async function lockForTransaction(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
```

Check it once on the Neon `development` branch through the pg adapter.

### 2. `billing/domain/subscription.ts`

Pure, with tests. Its own types, since `domain/` imports no package.

```typescript
import { isProStatus } from "@/features/billing/domain/limits";

const ENDED_STATUSES = ["canceled", "incomplete_expired"];

export interface SubscriptionSnapshot {
  id: string;
  customerId: string;
  status: string;
  currentPeriodEnd: Date | null;
}

export interface SubscriptionWrite {
  where: { stripeCustomerId: string; stripeSubscriptionId?: string };
  data: {
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
  };
}

// A live subscription takes the row. Any other writes only over itself, so the
// end of an old subscription cannot overwrite a newer one.
export function subscriptionWrite(
  snapshot: SubscriptionSnapshot,
): SubscriptionWrite {
  const { id, customerId, status, currentPeriodEnd } = snapshot;
  return {
    where: isProStatus(status)
      ? { stripeCustomerId: customerId }
      : { stripeCustomerId: customerId, stripeSubscriptionId: id },
    data: {
      status,
      stripeSubscriptionId: ENDED_STATUSES.includes(status) ? null : id,
      currentPeriodEnd,
    },
  };
}
```

| Status | Class |
| ------ | ----- |
| `active`, `trialing`, `past_due` | Live: overwrites by customer |
| `incomplete`, `unpaid`, `paused` | Writes only over its own id |
| `canceled`, `incomplete_expired` | Same, and clears the id |

Test every status in this table.

### 3. `billing/_internal/services/subscription-sync.ts`

```typescript
import "server-only";

const SYNC_TIMEOUT_MS = 15_000;

function toSnapshot(subscription: StripeSubscription): SubscriptionSnapshot {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return {
    id: subscription.id,
    customerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    status: subscription.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  };
}

async function retrieveSubscription(id: string) {
  try {
    return await getStripe().subscriptions.retrieve(id);
  } catch (error) {
    if (isStripeNotFound(error)) return null;
    throw error;
  }
}

// The read is inside the lock, so an older state can never commit last. Safe
// to run many times and at once: webhook retries, and the return from Checkout.
export async function syncSubscription(
  customerId: string,
  subscriptionId: string,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await lockForTransaction(tx, `stripe-customer:${customerId}`);
      const subscription = await retrieveSubscription(subscriptionId);
      if (!subscription) return;

      const { where, data } = subscriptionWrite(toSnapshot(subscription));
      // The signed event or a checked session is the authority for this write,
      // which is why it is not scoped by userId. No row: a deleted account or
      // a customer that is not ours.
      const { count } = await tx.subscription.updateMany({ where, data });
      if (count === 0) {
        console.warn(`No row took subscription ${subscriptionId}`);
      }
    },
    { timeout: SYNC_TIMEOUT_MS },
  );
}
```

### 4. Webhook

`billing/services/webhook.ts`:

```typescript
import "server-only";

function idOf(value: string | { id: string } | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

// Each event only names a subscription: the state comes from Stripe, because
// events arrive out of order and their payloads can be stale.
function subscriptionRefs(event: StripeEvent) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode !== "subscription") return null;
      return {
        customerId: idOf(session.customer),
        subscriptionId: idOf(session.subscription),
      };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return {
        customerId: idOf(event.data.object.customer),
        subscriptionId: event.data.object.id,
      };
    default:
      return null;
  }
}

export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  const refs = subscriptionRefs(event);
  if (!refs?.customerId || !refs.subscriptionId) return;
  await syncSubscription(refs.customerId, refs.subscriptionId);
}
```

`src/app/api/webhooks/stripe/route.ts`:

```typescript
import { handleStripeEvent } from "@/features/billing/services/webhook";
import {
  constructStripeEvent,
  isStripeSignatureError,
  type StripeEvent,
} from "@/lib/stripe";

const INVALID_SIGNATURE = "Invalid signature";
const SERVER_ERROR = "Something went wrong";

function failure(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return failure(INVALID_SIGNATURE, 400);

  let event: StripeEvent;
  try {
    event = constructStripeEvent(await request.text(), signature);
  } catch (error) {
    if (isStripeSignatureError(error)) return failure(INVALID_SIGNATURE, 400);
    // 500 so Stripe retries: a missing secret is ours to fix.
    console.error("Verifying a Stripe event failed:", error);
    return failure(SERVER_ERROR, 500);
  }

  try {
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    // The log is the only record of an event: there is no event table.
    console.error(`Stripe event ${event.id} (${event.type}) failed:`, error);
    return failure(SERVER_ERROR, 500);
  }
}
```

The raw body comes from `request.text()`, with no extra config. The proxy matcher does not cover this path, so it needs no change.

### 5. Split `items/services/item.ts`

The file is about two lines under the 250-line limit, so nothing can be added. A refactor only, with no change in behaviour:

- `items/services/create-item.ts`: `createUserItem`, `confirmFileColumns`, `CreateItemResult`
- `items/_internal/services/item-writes.ts`: helpers shared with the update (`hasPrismaCode`, `tagLinks`, `collectionLinks`, the Prisma error codes)
- `item.ts` keeps update, favorite, pin and delete
- Move the create tests to `create-item.test.ts`, and update the import in `items/actions`

Run the tests, then go on.

### 6. Free limits

`items/services/create-item.ts`: read `isPro` once in `createUserItem` and pass it to `confirmFileColumns`. The R2 confirmation stays before the transaction, and the `try/catch` for P2025 and P2002 goes around it.

```typescript
const ITEM_LIMIT_REACHED = `You have reached the Free plan's limit of ${FREE_ITEM_LIMIT} items. Upgrade to Pro for unlimited items.`;

// Pro skips the lock and the count. Two parallel creates of a Free user wait
// here, so they cannot both pass the limit.
async function insertItem(
  userId: string,
  isPro: boolean,
  data: Prisma.ItemUncheckedCreateInput,
): Promise<{ id: string } | null> {
  const select = { id: true };
  if (isPro) return prisma.item.create({ data, select });

  return prisma.$transaction(async (tx) => {
    await lockForTransaction(tx, `free-items:${userId}`);
    const count = await tx.item.count({ where: { userId } });
    if (!withinFreeItemLimit(count)) return null;
    return tx.item.create({ data, select });
  });
}
```

`null` becomes `{ success: false, error: ITEM_LIMIT_REACHED, data: null }`.

`collections/services/collection.ts` `createUserCollection` does the same with `getEntitlements`, the key `free-collections:<userId>`, `withinFreeCollectionLimit`, and the message: "You have reached the Free plan's limit of 3 collections. Upgrade to Pro for unlimited collections." Build it from `FREE_COLLECTION_LIMIT`. `collections` now uses `billing`: add it to `docs/modules.md`.

Both dialogs already show the action's error and keep the form open. The existing tests need a `$transaction` mock and a value for `getEntitlements`.

### 7. Return from Checkout, server side

`billing/services/checkout.ts`:

`confirmCheckoutSession(userId: string, sessionId: string): Promise<OperationResult>`:

1. Retrieve the session
2. Fail with a generic result unless `session.metadata?.userId === userId`, `session.status === "complete"`, and the customer and subscription are present
3. `await syncSubscription(customerId, subscriptionId)`

`billing/actions/checkout.ts` `confirmCheckout(sessionId: unknown): Promise<ActionResult<{ isPro: boolean }>>`: parse with `checkoutSessionIdSchema`, `getSessionUser()` outside the `try`, call the service, read `getBillingOverview` **after** it, `refresh()`, return `isPro`.

`getBillingOverview` is cached per request, so the action must not read it before the sync.

### 8. Billing UI

`billing/_internal/components/hooks/use-billing-redirect.ts`:

```typescript
import { useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

const START_FAILED = "Couldn't reach billing. Please try again.";

// A successful redirect to Stripe arrives as a rejection and the page then
// navigates away, so the error must go on and isPending holds until unload.
export function useBillingRedirect() {
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) toast.error(result.error ?? START_FAILED);
      } catch (error) {
        unstable_rethrow(error);
        toast.error(START_FAILED);
      }
    });
  }

  return { isPending, run };
}
```

Check against `CreateItemDialog.tsx` that an external redirect passes through `unstable_rethrow`, and that `isPending` resets after Back. Test both in the browser. Use a separate state for which button is active, for the spinner.

`billing/_internal/components/hooks/use-checkout-return.ts`:

```typescript
const TOAST_ID = "checkout-return";
const WELCOME = "Welcome to DevStash Pro!";
const PENDING = "Payment received, your plan will update shortly.";
const SETTINGS_URL = "/settings";

// isPro is usually true on arrival: Stripe waits for the webhook before the
// redirect. The fixed toast id covers effects that run twice in development.
export function useCheckoutReturn(sessionId: string | null, isPro: boolean) {
  const router = useRouter();
  const [, startConfirming] = useTransition();

  useEffect(() => {
    if (!sessionId) return;

    if (isPro) {
      toast.success(WELCOME, { id: TOAST_ID });
      router.replace(SETTINGS_URL);
      return;
    }

    function settle() {
      toast.info(PENDING, { id: TOAST_ID });
      router.replace(SETTINGS_URL);
    }

    startConfirming(async () => {
      try {
        const result = await confirmCheckout(sessionId);
        // On success the action's refresh brings isPro, and this effect runs
        // again: the toast arrives with the screen it confirms.
        if (!result.success || !result.data?.isPro) settle();
      } catch (error) {
        unstable_rethrow(error);
        settle();
      }
    });
  }, [sessionId, isPro, router]);

  return { isConfirming: sessionId !== null && !isPro };
}
```

`billing/components/BillingSection.tsx`, `"use client"`:

Props: `isPro`, `hasBillingAccount`, `paymentIssue`, `itemCount`, `collectionCount`, `checkoutSessionId: string | null`.

- Credit card icon and a "Billing" heading, like the other sections
- A card with the plan badge (Pro or Free)
- `isConfirming`: "Confirming your payment…" instead of the Upgrade buttons
- Free: `{itemCount}/50 items`, `{collectionCount}/3 collections`, and the buttons "Upgrade $8/mo" (primary) and "Upgrade $72/yr (save 25%)" (outline). Build the numbers from the constants in `limits.ts`, with `proYearlySavingsPercent()`
- Pro with `paymentIssue`: "Your last payment didn't go through. Open Manage Billing to fix it." above Manage Billing. Not "update your card": an EU card can also fail because the bank wants authentication
- Pro with `hasBillingAccount`: "Manage Billing" (outline)
- Pro without a billing account (the demo user): the badge only
- `Loader2` on the active button, all buttons disabled while pending

Split it if it passes 80 lines: `UsageSummary` and `BillingActions` in `_internal/components/`.

`app/(app)/settings/_components/BillingPanel.tsx`, a server component like `AccountActions`:

```tsx
interface BillingPanelProps {
  searchParams: Promise<{ session_id?: string | string[] }>;
}

export async function BillingPanel({ searchParams }: BillingPanelProps) {
  const { id: userId } = await getSessionUser();
  const [{ session_id: sessionId }, overview, items, collections] =
    await Promise.all([
      searchParams,
      getBillingOverview(userId),
      getItemStats(userId),
      getCollectionStats(userId),
    ]);

  return (
    <BillingSection
      {...overview}
      itemCount={items.total}
      collectionCount={collections.total}
      // ?session_id=a&session_id=b gives an array.
      checkoutSessionId={typeof sessionId === "string" ? sessionId : null}
    />
  );
}
```

`settings/page.tsx` takes `searchParams` and renders `<BillingPanel searchParams={searchParams} />` between `EditorPreferencesSection` and `AccountActions`, without awaiting it. Update the subtitle to name billing.

`settings/loading.tsx`: a block between the two sections, with a height constant that matches the Free layout.

### 9. Account deletion

`billing/services/customer.ts`:

```typescript
import "server-only";

// Deleting the customer cancels its subscriptions at once. Returns whether
// anything was cancelled. No customer: the demo user keeps its row.
export async function deleteBillingCustomer(userId: string): Promise<boolean> {
  const customerId = await getStripeCustomerId(userId);
  if (!customerId) return false;

  try {
    await getStripe().customers.del(customerId);
  } catch (error) {
    if (!isStripeNotFound(error)) throw error;
  }

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "canceled",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    },
  });
  return true;
}
```

`account/_internal/services/delete-account.ts`, between the verification and the first purge:

```typescript
const CANCEL_FAILED =
  "Your subscription could not be cancelled, so nothing was removed. Please try again.";
const PURGE_FAILED_AFTER_CANCEL =
  "Your subscription was cancelled, but your files could not be deleted. Please try again.";
```

- A throw from `deleteBillingCustomer` is logged and answers `CANCEL_FAILED`
- A failed first purge answers `PURGE_FAILED_AFTER_CANCEL` if something was cancelled, and `PURGE_FAILED` otherwise

Keep the function under 50 lines: move the cancel into a small private helper if needed.

The `customer.subscription.deleted` event that follows finds no row, or a row without that id, and writes nothing.

### 10. Docs, in the same change

- `docs/modules.md`: `billing` (what was built, the stale "nothing enforces them" line), `items`, `collections` (uses `billing`), `account` (uses `billing`)
- `docs/architecture.md`: the Free limit, the known risks in section 10 of the plan, and the exception that a webhook write is scoped by customer and not by user. Rule 4 in `context/architecture-rules.md` covers reads only, so name the exception there too
- `context/todo.md`: reconciliation for lost webhooks

## New Files

| File | Purpose |
| ---- | ------- |
| `src/lib/advisory-lock.ts` | Transaction lock |
| `src/app/api/webhooks/stripe/route.ts` | Verify, one service call |
| `src/features/billing/domain/subscription.ts`, test | `subscriptionWrite` |
| `src/features/billing/services/webhook.ts`, test | Event to subscription |
| `src/features/billing/_internal/services/subscription-sync.ts`, test | Lock, read, write |
| `src/features/billing/services/customer.ts`, test | `deleteBillingCustomer` |
| `src/features/billing/components/BillingSection.tsx` | Billing UI |
| `src/features/billing/_internal/components/hooks/use-billing-redirect.ts` | Upgrade and portal transition |
| `src/features/billing/_internal/components/hooks/use-checkout-return.ts` | Return from Checkout |
| `src/app/(app)/settings/_components/BillingPanel.tsx` | Session, plan, counts |
| `src/features/items/services/create-item.ts`, test | Moved from `item.ts`, plus the limit |
| `src/features/items/_internal/services/item-writes.ts` | Shared write helpers |

## Modified Files

| File | Changes |
| ---- | ------- |
| `src/features/billing/services/checkout.ts`, test | `confirmCheckoutSession` |
| `src/features/billing/actions/checkout.ts` | `confirmCheckout` |
| `src/features/items/services/item.ts`, `item.test.ts` | Create path moved out |
| `src/features/items/actions/*` | Import from `create-item` |
| `src/features/collections/services/collection.ts`, test | Free limit |
| `src/features/account/_internal/services/delete-account.ts`, test | Cancel first, new messages |
| `src/app/(app)/settings/page.tsx`, `loading.tsx` | Panel and skeleton |
| `docs/modules.md`, `docs/architecture.md`, `context/architecture-rules.md`, `context/todo.md` | See step 10 |

There is no migration in this phase: `StripeEvent` was dropped by ADR 0011.

## Testing

### Unit

- `subscriptionWrite`: every status in the table; an old subscription ending while a newer one is stored
- `syncSubscription`: a missing subscription, zero rows, the lock taken before the read
- `handleStripeEvent`: ignored types, a Checkout session that is not a subscription, an event with no subscription
- `confirmCheckoutSession`: a foreign session, an incomplete session
- `deleteBillingCustomer`: a missing customer, no customer id
- `deleteAccount`: cancel fails, purge fails after a cancel, purge fails with nothing cancelled
- `createUserItem`, `createUserCollection`: at the limit, under it, Pro skips the lock

### Real database and Stripe test mode

Mocks cannot prove these.

- [ ] Two parallel creates at 49 items: one succeeds. Same at 2 collections
- [ ] Upgrade with `4242 4242 4242 4242`, monthly and yearly: the row is `active`, with both ids and `currentPeriodEnd`
- [ ] Declined card `4000 0000 0000 0002`; 3D Secure `4000 0000 0000 3220`
- [ ] Cancel in the portal: Pro until the period ends, then Free
- [ ] Failed renewal with a test clock: `past_due` keeps Pro and shows the warning, then cancelled after the retries
- [ ] Renewal that needs authentication (3D Secure test card, test clock): the customer can finish the payment from the portal or Stripe's email
- [ ] Resend an event: nothing changes
- [ ] Delete the customer in the Dashboard, then upgrade: works
- [ ] Delete an account within 24 hours of creating its customer with the purge failing, then upgrade: works
- [ ] "Limit to one subscription" applies to a session created through the API

`stripe trigger` does not test the sync: its fixtures create their own customers, so zero rows match. Use it only to see the route answer 200, and use real test checkouts for the rest.

### Browser

- [ ] Return without `stripe listen`: "Confirming…", then Pro through the action
- [ ] Reload with `session_id` in the URL: no second toast, and the URL is cleaned
- [ ] Another account with someone else's `session_id`: the plain message, no upgrade
- [ ] Back from Stripe: the Upgrade buttons work again
- [ ] A successful upgrade shows no error toast
- [ ] Free at a limit: the plain error, and the form stays open
- [ ] Pro sees Manage Billing, Free sees usage and Upgrade, the demo user sees only the badge
- [ ] A plan change shows after a reload, without signing in again
- [ ] `/settings` does not shift while loading

`npm run test`, `npx tsc --noEmit`, `npm run lint` and `npm run build` must pass.

## Notes

- `presign-upload.ts` and the file checks do not change
- `PricingSection` does not change here. It lists Custom types, AI and Export, which do not exist: decide on that before live mode (section 10 of the plan)
- Pro never reads the session: a reload shows the new plan because `getEntitlements` reads the row
