# 0033. Tax, prices in euros, the failed-payment policy and a daily reconciliation

- Status: accepted
- Date: 2026-11-18

## Context

The prices were US dollars with no tax, which a shop selling to consumers in Germany cannot show. The failed-payment policy of ADR 0011 was left for this feature to confirm or change. And a webhook lost for longer than Stripe's three days of retries left a `Subscription` row stale with no way back.

## Decision

### Prices and tax

- **Prices:** €8 a month and €72 a year, gross, including VAT.
  - The Stripe Price objects are in EUR with `tax_behavior: "inclusive"`, so the amount the customer pays stays the same whatever the rate.
  - The price ids stay in `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY`.
- **Formats:** the `price` format of `i18n/config.ts` is EUR, showing whole euros without decimals. The cards say "incl. VAT" and the order step says "Total including VAT".
- **Stripe Tax:** the session sets
  - `automatic_tax: { enabled: true }`;
  - `tax_id_collection`;
  - a required billing address;
  - `customer_update` (address and name).

  Stripe works out the VAT of the customer's country and shows it on its page.

- **Setup:** the Dashboard settings (an origin address and a registration) are made in the Dashboard, by the account owner. The README lists them.
- **Payment methods:** cards only (`payment_method_types: ["card"]`). SEPA Direct Debit and PayPal stay in `context/todo-before-live.md`.

### Failed payments

The policy of ADR 0011 stays:

- After a failed renewal the subscription is `past_due`, and Pro remains while Stripe retries (8 tries in about two weeks).
- When the retries end, the Dashboard cancels the subscription. The user is on Free, with all data kept.

`unpaid` was weighed and not taken:

- it keeps a contract alive that nobody pays;
- it needs Manage Billing and the payment warning for non-Pro users too.

The AGB state the policy (section 6). The lawyer checks whether two weeks support the cancellation.

### Daily reconciliation

`billing/services/reconciliation.ts` runs last in the daily cron (ADR 0030). It makes two passes:

1. **Every row that names a subscription,** the least recently written first, read once before any write. Each is synced (`syncSubscription`), which ends a Pro row whose cancellation was lost.
2. **Stripe's subscriptions that are not canceled** (paged, at the deadline it stops). A live one whose row does not name it is synced, which grants Pro after a lost `checkout.session.completed`. A live one whose row already names another live subscription is not synced: the customer pays twice, which is logged as an error with both ids for a refund by hand, and counted as `duplicate`.

How the job behaves:

- **The write:** it stays the sync's (the lock, the read inside it, written by customer, ADR 0012). So the job is idempotent, and a row that is right costs one Stripe read and no write.
- **The report:** `checked`, `corrected`, `missingRow` and `duplicate`.
- **A subscription Stripe no longer has** (test data cleared, a deleted object) ends the row that names it, like an ended status, so a Pro row cannot outlive its subscription.
- **Foreign subscriptions:** a subscription of a customer with no row (a deleted account, or another project on a shared test account) is counted, and the job warns once per run.
- **Confirmations:** the job also sends a § 312f confirmation whose email failed before (ADR 0032).

## Consequences

- **A new Stripe setup:** the EUR prices and Stripe Tax must be set up in test mode before a purchase works. Until then the new session parameters make Checkout refuse the session.
- **Stripe's API budget:** the job reads Stripe once per subscription per day. At this size that is well inside Stripe's limits. A few thousand subscribers would need the read spread over days, or a cursor kept between runs.
- **Closed risks:** "Lost webhooks" in `docs/architecture.md` is closed. "Two open Checkout tabs" is narrowed (ADR 0032).
