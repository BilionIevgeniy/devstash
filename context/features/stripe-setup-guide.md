# Stripe Setup Guide

How to set up Stripe for DevStash: the Dashboard, the webhook in production and locally, and how to check it works. The reasons behind each decision are in [docs/stripe-integration-plan.md](../../docs/stripe-integration-plan.md). Repeat everything in live mode before launch: a sandbox and live mode each have their own keys, prices and webhook secret.

## State on 2026-11-06

| What                                              | State                                                  |
| ------------------------------------------------- | ------------------------------------------------------ |
| Code (Checkout, portal, sync, webhook route)      | Done                                                   |
| Sandbox webhook destination `devstash-production` | Created                                                |
| `STRIPE_WEBHOOK_SECRET` in Vercel Production      | Set, the deployed route answers 400 to a bad signature |
| `STRIPE_WEBHOOK_SECRET` in the local `.env`       | Set                                                    |
| `STRIPE_SECRET_KEY` in Vercel Preview             | Not set, so Checkout does not work on Preview          |
| Dashboard settings in step 1                      | Not confirmed                                          |
| A test payment and cancel, locally                | Passed, monthly plan                                   |
| A test payment in production                      | Not run                                                |
| Live mode                                         | Not set up                                             |

## Environment variables

| Variable                  | Local `.env`               | Vercel Production        | Where it comes from                        |
| ------------------------- | -------------------------- | ------------------------ | ------------------------------------------ |
| `STRIPE_SECRET_KEY`       | Sandbox key                | Key of the mode in use   | Developers > API keys                      |
| `STRIPE_WEBHOOK_SECRET`   | Printed by `stripe listen` | The destination's secret | See steps 2 and 3. The two values differ   |
| `STRIPE_PRICE_ID_MONTHLY` | Sandbox price              | Price of the mode in use | Product catalog > DevStash Pro, $8 a month |
| `STRIPE_PRICE_ID_YEARLY`  | Sandbox price              | Price of the mode in use | Product catalog > DevStash Pro, $72 a year |

All four in one environment must come from the same mode. An event from another mode fails the signature check and the route answers 400.

`STRIPE_PUBLISHABLE_KEY` is not needed: hosted Checkout does not use it.

## 1. Dashboard settings

1. **Product:** "DevStash Pro" with two recurring prices, $8 monthly and $72 yearly
2. **One subscription per customer:** Settings > Checkout and Payment Links > Subscriptions: redirect customers who already have one to the portal. Keep the portal login link on, or this setting stops working
3. **Customer portal:** activate it. Allow updating the payment method, viewing invoices, cancelling at period end, and switching between the two prices
4. **Failed payments:** Billing > Revenue recovery: Smart Retries with 8 tries in 2 weeks, then cancel the subscription. Turn on the failed-payment emails. If subscriptions stay `past_due` after the last try, Pro never ends without payment

## 2. Webhook in production

In Developers > Webhooks, create an event destination:

| Field                   | Value                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| Event destination scope | Your account (not connected accounts or an organization)                                       |
| Payload style           | Snapshot. The code reads the object from the event, so Thin does not work                      |
| API version             | `2026-10-28.endive`, the version of the installed SDK. Check it after a `stripe` upgrade       |
| Events                  | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` |
| Destination type        | Webhook endpoint                                                                               |
| Destination name        | `devstash-production`                                                                          |
| Endpoint URL            | `https://devstash.ievgenbilion.de/api/webhooks/stripe`                                         |

Three events are enough. A failed payment or a renewal also fires `customer.subscription.updated`, and the sync reads the current state from Stripe. Any other event is ignored and answered with 200. Course material may list payment events too: they are not needed here.

Then:

1. Open the created destination and copy its **Signing secret** (`whsec_...`)
2. In Vercel: Settings > Environment Variables, add `STRIPE_WEBHOOK_SECRET` for Production, marked Sensitive
3. Redeploy the latest production deployment. A running deployment does not see a new variable

Check the route. A bad signature must answer 400. A 500 means the running deployment has no secret:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'stripe-signature: t=1,v1=bad' -d '{}' https://devstash.ievgenbilion.de/api/webhooks/stripe
```

## 3. Webhook locally

1. Once, choosing the sandbox: `stripe login`
2. In a separate terminal, kept open while testing:

   ```bash
   stripe listen --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted --forward-to localhost:3000/api/webhooks/stripe
   ```

3. Copy the printed `whsec_...` to `STRIPE_WEBHOOK_SECRET` in `.env`
4. Restart `npm run dev`

When production uses the same sandbox, local test events also reach the production endpoint, and production events reach `stripe listen`. This is safe: the customer has no row in that database, so nothing is written and the log shows `No row took subscription`.

## 4. Test a payment

Use a newly registered account. A user with an `active` row and no Stripe ids, like the demo user before the Free plan seed, sees no Upgrade buttons and Checkout refuses them.

1. In `/settings`, press Upgrade and pay with `4242 4242 4242 4242`, any future date and any CVC
2. The plan becomes Pro, and `stripe listen` shows `[200]` for each event. In production, check the deliveries on the `devstash-production` destination
3. The `Subscription` row is `active`, with both Stripe ids and `currentPeriodEnd`
4. Cancel in Manage Billing: `customer.subscription.updated` arrives and the user stays Pro until the period ends
5. Cancel at once in the Dashboard: `customer.subscription.deleted` arrives and the plan becomes Free

`stripe trigger` proves only that the route answers 200: its fixtures create their own customers, so no row matches. The full list of checks is in [stripe-phase-2-spec.md](stripe-phase-2-spec.md).

## Troubleshooting

| Symptom                                                                          | Cause                                                                                                                                            | Fix                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The route answers 500 to a bad signature                                         | The running deployment has no `STRIPE_WEBHOOK_SECRET`                                                                                            | Set it, redeploy, and check the new deployment is `READY`                                                                                                                                                                              |
| Valid events get 400                                                             | Wrong secret, or the key and the destination are in different modes                                                                              | Copy the secret again from the same mode, then redeploy                                                                                                                                                                                |
| Paid, but the plan changes only on return to `/settings`                         | The webhook does not arrive. The return from Checkout confirms the plan on its own, so the payment hides the problem                             | Check the destination's deliveries. Cancels and renewals depend on the webhook                                                                                                                                                         |
| Build fails with `P1002`, "Timed out trying to acquire a postgres advisory lock" | `DIRECT_URL` in Vercel points to the `-pooler` host. Session advisory locks do not work through the transaction pooler, and a lock can stay held | Set `DIRECT_URL` to the direct string from Neon (Connect, with Connection pooling off), keep the pooled `DATABASE_URL`, and redeploy. If it fails again, restart the compute of the branch in Neon: connections drop for a few seconds |

## Before live mode

- Repeat steps 1 and 2 in live mode, and set the live key, prices and webhook secret in Vercel Production. Keep test keys for Preview
- The demo payment hint under the Upgrade buttons in `/settings` goes away by itself once the live key is set and the app is redeployed. It stays on Preview, which keeps a test key
- Check the failed-payment setting by hand in live mode: a test clock proves only the sandbox
- Check that a second Checkout for a customer who has just paid is blocked: with a late webhook the Upgrade button and `/upgrade` stay live ("Two open Checkout tabs" in `docs/architecture.md`)
- Build the Pro features sold on the homepage, or mark them as coming soon: Custom types, AI, Export ("Pro features" in `context/todo.md`)
- Decide VAT and the cancellation button of § 312k BGB ("Germany: tax and legal" in `context/todo.md`)
- Run the checks in [stripe-phase-2-spec.md](stripe-phase-2-spec.md)
