# Stripe Integration Plan

The plan for DevStash Pro ($8 a month, $72 a year). Phases 1 and 2 are built. Section 2 describes the code as it was before Phase 1. The steps to follow are in two specs:

- [context/features/stripe-phase-1-spec.md](../context/features/stripe-phase-1-spec.md): SDK, limits, checkout, portal, ADR 0011
- [context/features/stripe-phase-2-spec.md](../context/features/stripe-phase-2-spec.md): webhook, gating, billing UI, account deletion

This document holds the analysis and the reasons. Checked on 2026-11-06 against the code, `stripe` 23.1.0 (API version `2026-10-28.endive`), `next-auth` 5.0.0-beta.32 (`@auth/core` 0.41.3), the Next.js 16 docs in `node_modules`, the Stripe docs, and an independent review by the `architecture-reviewer` agent.

## 1. Where the plan comes from: database or JWT

The research prompt's Notes suggest reading `User.isPro` in the `jwt` callback on every session validation. We already read the plan through `billing/queries.ts` `getEntitlements` (ADR 0005). Both were compared.

| Question | `isPro` in the JWT (the Notes) | `getEntitlements` (ours) |
| -------- | ------------------------------ | ------------------------ |
| Fresh after a webhook? | Yes. `@auth/core/lib/actions/session.js` runs `callbacks.jwt` on every session read | Yes. It reads the row on each request |
| Works as written today? | No. Nothing writes `User.isPro`, so every customer stays Free | Yes |
| Allowed by the ranks? | No. `auth` (rank 1) cannot read `Subscription`, owned by `billing` (rank 2) | Yes |
| Allowed by the lint? | No. `prisma` reads are blocked in `nextauth/` | Yes |
| Reaches services? | No. `presignUpload(userId)` and `createUserItem(userId)` take an id, and services may not read the request. A webhook, an import or the future public API has no session | Yes. It needs only the `userId` |
| What happens on a database error? | The `jwt` catch keeps the old token, so a stale `isPro` keeps passing | The read fails and the action answers with its generic error |
| Queries on routes that need no plan? | One more on every `auth()` call, including each `/api/search` keystroke | None |

**The decision stays: `getEntitlements`.** The Notes are right about two things: `trigger === "update"` does not help here (it only fires from a client `useSession().update()`, and this app has no `SessionProvider`), and a page reload is enough. A reload is also enough with `getEntitlements`, so the workaround solves a problem we do not have.

The cost argument is weaker than ADR 0005 suggests. `getSessionUser` is wrapped in `cache()`, so `auth()` runs about once per request, not several times per page, and `NewItemButton` reads the plan on most app pages anyway. The two reads cost about the same. The decisive reasons are ownership and that services need the plan without a session.

## 2. Current state

### Data

- `Subscription` exists: `userId` (unique), `status` (plain string), `stripeCustomerId` (unique), `stripeSubscriptionId` (unique), `currentPeriodEnd`. It cascades when the user is deleted
- `User.isPro`, `User.stripeCustomerId` and `User.stripeSubscriptionId` are superseded, read by nothing, and wait for the contract migration in `context/todo.md`. This work does not touch them
- Migration `20261030135922_demo_user_pro` gives `demo@devstash.io` an `active` row with **no Stripe customer**. In development the row is removed and the seed grants none, so the demo user is on the Free plan

### Session

- NextAuth v5 with JWT sessions, GitHub and credentials. The `jwt` callback reads `sessionVersion` to revoke tokens. A database error there keeps the token
- Server components, actions and pages call `getSessionUser()` (cached, redirects when signed out). Routes and the delete action call `auth()` to answer with an error instead of a redirect
- No `useSession` or `SessionProvider`. `isPro` reaches client components as a prop, through `NewItemButton`, `CreateMenu` and the type page

### Billing code

| Exists | Missing |
| ------ | ------- |
| `billing/domain/limits.ts`: limits, prices, `isProStatus`, `entitlementsFor`, with tests | `stripe` package, `lib/stripe.ts` |
| `billing/queries.ts` `getEntitlements` | Checkout, portal, webhook |
| `billing/components/ProBadge` | `BillingSection` |
| Homepage pricing built from the constants | Enforcement of the Free limits |
| | Stripe cancellation on account deletion |

## 3. Feature gating

| Feature | State | Where |
| ------- | ----- | ----- |
| File and image upload | **Enforced** | `files/services/presign-upload.ts` |
| File and image items | **Enforced** | `confirmFileColumns` in `items/services/item.ts` |
| File and image in the UI | **Done** | `ItemTypeSelect` (disabled, `ProBadge`), the sidebar, the type page |
| 50 items | Not enforced | `createUserItem`, the only `item.create` |
| 3 collections | Not enforced | `createUserCollection`, the only `collection.create` |
| Custom types, AI, export | **Not built** | Each gates itself when built (`docs/modules.md`) |

Counts for the UI come from `getItemStats` and `getCollectionStats`, which already exist.

A user who drops to Free keeps everything: existing items and files stay readable and editable. Only creating past a limit is refused.

The settings page (`app/(app)/settings/page.tsx`) composes `EditorPreferencesSection` and `AccountActions`. `AccountActions` fetches for itself, so the billing section follows that shape through a `BillingPanel`. `billing` (rank 2) cannot read counts from `items` or `collections`, so the panel in `app/` passes them as props.

## 4. Patterns to follow

- **Routes:** thin. `failure()` helper, `{ success, data, error }`, `try/catch` with `await logger.error`, see `api/auth/register/route.ts`. The proxy matcher covers pages only, so `/api/webhooks/stripe` needs no change there
- **Actions:** parse with a schema, `getSessionUser()` outside the `try`, one service call, `refresh()`, a local `failure()`. `redirect()` stays outside the `try` (`delete-account.ts`). `getAppOrigin()` is read in the action inside the `try` and passed in (`password-reset.ts`)
- **Client:** `useTransition` with `try` and `unstable_rethrow(error)` first in the catch (`CreateItemDialog.tsx`)
- **Env:** read lazily where used, never at module load; `.env.example` documents each one. `lib/r2.ts` is the model for a vendor client
- **Vendors:** the lint rule `VENDOR_SDKS` has no type exception, so `import type Stripe from "stripe"` fails outside `lib`. `lib/stripe.ts` re-exports the types `billing` needs
- **Next.js:** `redirect()` accepts absolute URLs and works from a Server Action (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`)

## 5. Design decisions

Where these differ from the drafts in `featuresDRAFT/`, this plan wins. The specs in `context/features/` already follow it.

### Webhooks save the current state, not the event

Stripe does not guarantee delivery order, and an event's payload is a snapshot that can be stale. So every handled event only names a subscription. The service fetches that subscription from Stripe and saves what it finds. Delivering the same event twice writes the same state.

`customer.subscription.updated` fires on renewals and plan changes, so `invoice.paid` and `invoice.payment_failed` are not needed. Three events are handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

An older read must not commit last: event A reads `active`, the user cancels, event B reads `canceled` and commits, then A commits `active`, and the user keeps Pro for free with no further event to correct it. So the sync takes an advisory lock on the customer id, reads from Stripe inside the transaction, then writes. This holds a transaction open during one HTTP call, which is acceptable at this volume, with an explicit `timeout`.

### No `StripeEvent` table

The draft and the current docs plan a `StripeEvent` record for idempotency. With the design above it adds nothing, and the architecture review confirmed dropping it:

- **Duplicates:** the write is idempotent without it. A duplicate costs one Stripe read and a write that changes nothing. Stripe offers logging event ids as a way to guard against duplicates, not as a requirement, and notes that one change can produce two separate Event objects, which an id would not catch anyway
- **Audit:** a table of ids records no payment or decision. Invoices and payments stay in Stripe, and storing payloads would mean holding personal data with no retention rule
- **Debugging:** it answers only "did we process this id?", which a log line does too, so the route logs `event.id` and `event.type` on failure

**A side effect that must run once is not a reason to bring it back.** An event id is the wrong key: two Event objects for one change would send a welcome email twice, and `confirmCheckoutSession` syncs without any event. Such an effect claims a business fact on the row inside the sync transaction (`updateMany` where `welcomedAt` is null, sent only when `count === 1`).

The accepted cost: no local record of processed events, so an investigation relies on Stripe's event log and the Vercel logs, both with limited retention. ADR 0011 records all of this.

### `past_due` keeps Pro

The draft contradicts itself ("don't downgrade" against "else Free"), and `limits.ts` says `past_due` is Free. `PRO_STATUSES` becomes `active`, `trialing`, `past_due`.

**The principle: Pro lasts while Stripe is still trying to collect, and ends once it has stopped.** `past_due` means retrying. `unpaid` and `paused` mean collection has stopped, so they stay non-Pro, which also fails closed if the Dashboard is set wrongly.

The rule for DevStash, sold from Germany mainly to consumers:

| Step | What happens |
| ---- | ------------ |
| Renewal fails | Status `past_due`. Pro stays, `BillingSection` shows a warning, and Stripe sends its email |
| Up to 2 weeks | Stripe retries, 8 tries (its recommended default) |
| Payment succeeds | Status `active`, and the warning clears by itself |
| Last try fails | Status `canceled`. The user is on Free, with all data kept |

Why this fits:

- **Stripe:** its guidance is to notify on `past_due` and revoke on `canceled` or `unpaid`
- **German law:** commentary on software rental says locking access after one or two days of arrears probably violates good faith (Treu und Glauben, § 242 BGB), and the BGH limits withholding under § 320 BGB where the breach is minor. A grace period avoids that question
- **Nothing is lost:** `getEntitlements` gates only creating file and image items and uploads. No path deletes data, and reading, downloading, editing and deleting stay open

The cost is up to two weeks of unpaid Pro per failed renewal, about $3.70 on the monthly plan, recovered if the invoice is paid later.

**This depends on a Dashboard setting.** If subscriptions stay `past_due` after the last retry, Pro never ends without payment. That costs revenue and harms no customer, so no code limit is added, but the live setting must be checked by hand. ADR 0011 names this risk. ADR 0005 is marked superseded, since an accepted record is not edited, and ADR 0011 restates its decision in full.

This is research, not legal advice. Automatic cancellation ends the contract, which is a stronger step than withholding access: whether two weeks of arrears supports it, and whether the terms must state it, is a question for a lawyer (`context/todo.md`). If the answer is to use `unpaid` instead, `paymentIssue` and Manage Billing must also show for non-Pro users, because the UI would otherwise offer only Upgrade.

### Which subscription may write

`subscriptionWrite` in `billing/domain/subscription.ts`:

| Stripe status | Class | Effect |
| ------------- | ----- | ------ |
| `active`, `trialing`, `past_due` | live (`isProStatus`) | Overwrites the row found by `stripeCustomerId` |
| `incomplete`, `unpaid`, `paused` | not live | Writes only if its id equals the stored `stripeSubscriptionId` |
| `canceled`, `incomplete_expired` | ended | Same, and clears `stripeSubscriptionId` |

So the end of an old subscription cannot overwrite a newer one. The row is found by customer id because the row is created before Checkout. A write by customer id has no `userId`: the signed event is the authority for it, the one exception to scoping by user.

### Return from Checkout

Stripe recommends the webhook plus a trigger on the landing page, safe to run concurrently. The webhook is required, because the customer may never come back. Checkout waits at most 10 seconds for the webhook before redirecting, and not at all with the Stripe CLI, so the customer can land first.

The return URL is `/settings?session_id={CHECKOUT_SESSION_ID}`.

| On return | What happens |
| --------- | ------------ |
| Already Pro (the usual case) | Skip the action, toast "Welcome to DevStash Pro!", `router.replace("/settings")` |
| Not Pro yet | Show "Confirming your payment…" instead of the Upgrade buttons, call `confirmCheckout` |
| Confirmed | `refresh()` brings `isPro`, and the first row applies, so the toast never runs ahead of the screen |
| Foreign session, not complete, Stripe down, or still not Pro | "We couldn't confirm your payment yet. If you paid, your plan will update shortly.", then `router.replace("/settings")` |

### Upgrade buttons

A successful external redirect from a Server Action reaches the client as a rejected promise, and the page then navigates away. A plain `catch` would show an error toast on every successful upgrade. The buttons use `useTransition` with `unstable_rethrow`, and no `useState` pending flag, which could stay stuck after Back restores the page.

### Free limits under parallel requests

Count and insert in one transaction does not stop two parallel requests at Postgres's default isolation. `lib/advisory-lock.ts` takes `pg_advisory_xact_lock(hashtextextended(key, 0))`, which is released at commit and safe through Neon's transaction-mode pooler. It is called with `$executeRaw`, since the function returns `void`. Pro users skip the lock and the count.

### Stale Stripe customer

A customer deleted in the Dashboard leaves its id on the row. Stripe answers `resource_missing` for any id it cannot find, a wrong price id too, so only `param === "customer"` counts as a dead customer (checked in the sandbox). During checkout, the service then creates a new customer once, with no idempotency key, so `customer-<userId>` cannot replay the deleted one, and saves it over the dead id. The upsert's `update` branch writes only `stripeCustomerId`, never the status. The portal writes nothing and answers with a plain error: the webhook finds the row only by the customer id, so clearing it could leave a Pro row that no later event can end. Manage Billing keeps failing for that user until the webhook ends the subscription.

### Account deletion

The order is: verify, delete the Stripe customer, purge the files, delete the rows, as `docs/modules.md` already says. `customers.del` cancels active subscriptions at once, and cancelling first means nobody is billed after asking to leave.

- `deleteBillingCustomer` is a no-op without a customer id, so the demo user keeps Pro if the purge fails
- A missing customer counts as success
- It clears the Stripe ids and sets `canceled`, so the row cannot point at a dead customer
- A failed cancel aborts with its own message. A failed purge after a cancel says so: "nothing was removed" would be false

## 6. Files

Full steps and code are in the specs.

### Phase 1

| Create | Purpose |
| ------ | ------- |
| `src/lib/stripe.ts` | Client, event verification, error checks, type re-exports |
| `src/lib/stripe.test.ts` | The error checks against real `Stripe.errors` instances |
| `src/features/billing/schemas.ts` | `planSchema`, `checkoutSessionIdSchema` |
| `src/features/billing/types.ts` | `BillingOverview` |
| `src/features/billing/_internal/queries.ts` | `getStripeCustomerId` |
| `src/features/billing/services/checkout.ts` | Checkout and portal sessions |
| `src/features/billing/actions/checkout.ts` | `startCheckout`, `openBillingPortal` |
| `docs/adr/0011-past-due-grace-and-no-event-table.md` | Supersedes ADR 0005 |

| Modify | Change |
| ------ | ------ |
| `billing/domain/limits.ts` and test | `past_due` is Pro, Free limit functions, `billingOverviewFor` |
| `billing/queries.ts` | `getBillingOverview` |
| `eslint.config.mjs` | `VENDOR_SDKS` as an anchored regex, so it does not match `@/lib/stripe` |
| `.env.example` | Remove `STRIPE_PUBLISHABLE_KEY` |
| `docs/adr/0005-…`, `docs/adr/README.md` | Status only |
| `context/architecture-rules.md`, `docs/modules.md`, `docs/architecture.md`, `docs/arc42-lite.md` | No `StripeEvent`; `past_due`; Stripe client exists |

### Phase 2

| Create | Purpose |
| ------ | ------- |
| `src/lib/advisory-lock.ts` | Transaction lock |
| `src/app/api/webhooks/stripe/route.ts` | Verify, one service call |
| `billing/domain/subscription.ts` and test | `subscriptionWrite`, status classes |
| `billing/services/webhook.ts` | Event to subscription |
| `billing/_internal/services/subscription-sync.ts` | Lock, read, write |
| `billing/services/customer.ts` | `deleteBillingCustomer` |
| `billing/components/BillingSection.tsx` | Billing UI |
| `billing/_internal/components/hooks/use-checkout-return.ts` | Return from Checkout |
| `billing/_internal/components/hooks/use-billing-redirect.ts` | Upgrade and portal transition |
| `app/(app)/settings/_components/BillingPanel.tsx` | Reads session, plan and counts |
| `items/services/create-item.ts` | `createUserItem`, moved out of `item.ts` |
| `items/_internal/services/item-writes.ts` | Helpers shared by create and update |

| Modify | Change |
| ------ | ------ |
| `billing/services/checkout.ts`, `billing/actions/checkout.ts` | `confirmCheckoutSession`, `confirmCheckout` |
| `items/services/item.ts` and tests | Split out the create path |
| `collections/services/collection.ts` and test | Free limit |
| `account/_internal/services/delete-account.ts` and test | Cancel first, new messages |
| `app/(app)/settings/page.tsx`, `loading.tsx` | Panel and its skeleton |
| `docs/modules.md`, `docs/architecture.md`, `context/todo.md` | What was built, known risks |

`item.ts` has to split: it is about two lines under the 250-line limit, so the new code cannot go there.

## 7. Stripe Dashboard setup

Do this in a sandbox first, then again in live mode.

1. **Product:** create "DevStash Pro" with two recurring prices, $8 monthly and $72 yearly. Copy the ids to `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY`
2. **Keys:** copy the secret key to `STRIPE_SECRET_KEY`
3. **One subscription per customer:** Settings > Checkout and Payment Links > Subscriptions: redirect customers who already have one to the portal. Keep the portal login link on, or the setting stops working
4. **Customer portal:** activate it. Allow updating the payment method, viewing invoices, cancelling at period end, and switching between the two prices
5. **Failed payments:** Billing > Revenue recovery: Smart Retries with **8 tries in 2 weeks**, then **cancel the subscription** (see "`past_due` keeps Pro"). Turn on the failed-payment emails, and the email with the authentication link if it is a separate setting: an EU card can fail because the bank wants authentication, and retries do not fix that. Check this setting by hand in live mode, since a test clock proves only the sandbox
6. **Webhook:** add an endpoint at `https://devstash.ievgenbilion.de/api/webhooks/stripe` for the three events, on the **account, not an organization**: Checkout does not wait for organization endpoints. Use API version `2026-10-28.endive`. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`
7. **Vercel:** set the four variables for Production, with test keys for Preview. `APP_URL` is already required

Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, and copy the secret it prints.

## 8. Testing checklist

### Unit (Vitest)

- `limits`: every Stripe status against `isProStatus`; limits at 49, 50, 2 and 3
- `subscriptionWrite`: each row of the status table; an old subscription ending while a newer one is stored
- `syncSubscription`: a missing subscription, zero rows, an old subscription ending
- `handleStripeEvent`: ignored types, a non-subscription Checkout session
- `createCheckoutSession`: refuses Pro, reuses the customer, recovers from a dead customer, the upsert leaves the status alone
- `confirmCheckoutSession`: a foreign session, an incomplete session
- `deleteBillingCustomer`: a missing customer, no customer id
- `deleteAccount`: cancel fails, purge fails after a cancel
- `createUserItem`, `createUserCollection`: at the limit, under it, Pro skips the lock. Both test files need a `$transaction` mock and a value for `getEntitlements`

### Real database and test mode

Mocks cannot prove these.

- [ ] Two parallel creates at 49 items: one succeeds. Same at 2 collections
- [ ] `$executeRaw` runs the lock through the pg adapter on the Neon `development` branch
- [ ] Upgrade with `4242 4242 4242 4242`, monthly and yearly: the row is `active`, with both ids and `currentPeriodEnd`
- [ ] Declined card `4000 0000 0000 0002` and 3D Secure `4000 0000 0000 3220`
- [ ] Cancel in the portal: Pro until the period ends, then Free. A test clock moves time
- [ ] Failed renewal with a test clock: `past_due` keeps Pro and shows the warning, and the subscription is cancelled after the retries
- [ ] Renewal that needs authentication (3D Secure test card, test clock): the customer can finish the payment from the portal or Stripe's email. **Not confirmed by the docs**
- [ ] Resend one event: nothing changes
- [ ] Delete the customer in the Dashboard, then upgrade: works. **This pins Stripe behaviour the plan assumes**
- [ ] Delete an account within 24 hours of creating its customer with the purge failing, then upgrade: works
- [ ] "Limit to one subscription" applies to a Checkout session created through the API. **Stripe's docs do not confirm this**

`stripe trigger` does not test the sync: its fixtures create their own customers, so zero rows match. It only proves that the route answers 200 and logs. Use real test checkouts.

### Browser

- [ ] Return without `stripe listen` running: "Confirming…", then Pro through the action
- [ ] Reload with `session_id` in the URL: no second toast, and the URL is cleaned
- [ ] Another account returns with someone else's `session_id`: the plain message, no upgrade
- [ ] Back from Stripe: the Upgrade buttons work again
- [ ] Free at the limit: the plain error, and the form stays open
- [ ] Pro user sees Manage Billing, Free sees usage and Upgrade, the demo user sees neither
- [ ] `/settings` does not shift while loading

## 9. Implementation order

1. **Dashboard** (sandbox), section 7, steps 1 to 5
2. **Phase 1**: the ADR first, then SDK, limits, overview, checkout and portal. Nothing changes for users
3. **Phase 2, server:** lock, sync, webhook, then `stripe listen`
4. **Phase 2, gating:** the `item.ts` split on its own, with tests green, then the limits. Moving code and changing behaviour stay in separate steps
5. **Phase 2, account:** cancel before the purge. This must land with the UI or before it, never after, or a deleted account keeps being charged
6. **Phase 2, UI:** panel, section, hooks, skeleton
7. **Live mode:** Dashboard again, then the launch decision below

## 10. Known risks and open decisions

- **Decide before live mode: unbuilt features are on sale.** `PricingSection` lists Custom item types, AI features and Export under Pro. None exist. Tracked in "Pro features" in `context/todo.md`
- **Decide before live mode: German tax and consumer law.** VAT, the cancellation button (§ 312k BGB), withdrawal and the other consumer duties are not part of these two phases. Tracked in "Germany: tax and legal" in `context/todo.md`. The cancellation button will probably need code, and `automatic_tax` is one parameter on the session
- **Two open Checkout tabs can still create two subscriptions.** The service refuses a user who is already Pro, and the Dashboard setting redirects existing subscribers, but neither covers two sessions opened before either completes. The second live subscription wins the row and the first keeps billing until cancelled in the Dashboard. Rare, and visible in Stripe
- **Two open tabs on a dead customer.** Both replace it, and the later save wins the row. A payment on the earlier customer then matches no row, so the user has paid and stays Free until it is fixed by hand. It needs a dead customer and two open tabs, so the risk is accepted
- **Stripe behaviour not proven by the docs:** see the bold items in section 8
- **`subscriptionWrite` reuses `isProStatus`** for its live class, so a change to the grace policy also changes which subscription may write. A comment in the code says so
- **When `ai` lands,** `past_due` users get paid-for usage during the grace period. Decide that together with the quota
- **Reconciliation:** a webhook lost for longer than Stripe's 3 days of retries leaves the row stale. There is no periodic sync, and at this size the Dashboard's failed deliveries are enough. Goes to `context/todo.md`
- **Not in scope:** `cancelAtPeriodEnd` on the row (the portal shows it), trials, coupons, and the contract migration for the `User` columns

## Sources

- [Stripe: fulfill orders](https://docs.stripe.com/checkout/fulfillment)
- [Stripe: limit customers to one subscription](https://docs.stripe.com/payments/checkout/limit-subscriptions)
- [Stripe: subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe: webhook best practices](https://docs.stripe.com/webhooks)
- [Stripe: event ordering](https://docs.stripe.com/event-destinations/eventgrid)
- [Stripe: snapshot events](https://docs.stripe.com/events/set-up-events)
- [Stripe: item-level billing periods](https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-subscription-current-period-start-and-end)
- [Stripe: delete a customer](https://docs.stripe.com/api/customers/delete)
- [Stripe: Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- [Auth.js: `jwt` callback](https://authjs.dev/reference/nextjs)
- [Computerwoche: legal rules for software rental](https://www.computerwoche.de/article/2690469/rechtliche-regeln-fuer-die-softwaremiete.html)
- [BGH III ZR 157/10 (§ 320 BGB, a telecom case)](https://app.omnilex.ai/de/sources/court-decision/de-rii--kore311232011/bgh-2011-06-09-iii-zr-15710)
