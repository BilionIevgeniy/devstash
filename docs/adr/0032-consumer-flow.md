# 0032. The consumer flow: order step, consent, terms, confirmation, cancellation, downgrade

- Status: accepted
- Date: 2026-11-18

## Context

DevStash sells a subscription online to consumers in Germany. Stripe runs on test cards, but everything else is meant to work as it would for real. Before this feature, the checkout met none of the consumer-law duties:

- **§ 312j BGB:** the button that places the order must say that the order is payable.
- **§ 356 (5) BGB:** the right of withdrawal from a digital service ends early only if the consumer agreed that the service starts at once and confirmed knowing what that does to the right.
- **AGB:** the terms must be shown and accepted.
- **§ 312f BGB:** the consumer gets a confirmation of the contract on a durable medium.
- **§ 312k BGB:** a cancellation button must be reachable at all times, with a confirmation page and a confirmation email.

The duties of a downgrade were open too:

- A user over the Free limit could keep rewriting old items and so get around the limit.
- A former Pro user could still create items of their custom types.

This record is the design and our reading of the law. It is not legal advice: a lawyer checks it before live mode (`context/todo-before-live.md`).

## Decision

### Order step (§ 312j, § 356 (5))

- Both Upgrade entries open `OrderReview` before Stripe: the settings section (`CheckoutButtons`) and `/upgrade` (`UpgradePlans`).
- The step shows:
  - the plan;
  - the gross price including VAT;
  - the billing period and the renewal;
  - that the subscription can be cancelled at any time;
  - links to the AGB and to the withdrawal information.
- Two boxes must be ticked:
  - the AGB;
  - the consent to the immediate start, worded after § 356 (5).
- The button reads "Zahlungspflichtig bestellen". The English wording is "Order and pay".
- The server refuses an order without both consents (`checkoutOrderSchema`, `z.literal(true)`).
- Stripe's own button is labelled "Pay" (`submit_type: "pay"`). Next to it, `custom_text.submit` says that clicking it orders with an obligation to pay.
- Whether Stripe's label satisfies § 312j (3) is on the lawyer's list. The label Stripe shows is recorded by the browser check of the purchase.
- Rejected: Stripe's embedded Payment Element (`ui_mode: "elements"`). It would give our own button, but it costs the publishable key, `@stripe/stripe-js`, a wider CSP and more PCI surface on our page.
- A page restored from the back/forward cache (Back from Stripe) mounts the checkout UI fresh (`usePageRestoreKey`), so the consent never comes back ticked.

### The consent and its record

- The service stamps `withdrawalWaiverAt` (now) and `TERMS_VERSION` and puts them, with the plan and the locale, into the metadata of the Checkout session and of its subscription (`subscription_data.metadata`).
- The sync copies the consent from the subscription onto `Subscription.withdrawalWaiverAt` and `termsVersion`.
- Stripe keeps the record as long as the subscription exists; our row keeps it for the live subscription.

### One session builder; two open tabs

- `billing/domain/checkout-session.ts` `checkoutSessionParams` is the one place the session is shaped: consent, button, `automatic_tax`, tax id collection, cards only, `expires_at` 60 minutes ahead (Stripe needs at least 30).
- The service creates the session under an advisory lock per user. It lists the customer's open sessions first:
  - an open session for the same plan and terms is handed out again;
  - any other open session is expired before a new one is made.
- So two tabs that order at once end on one session, and on one subscription.
- What remains: a session completed in one tab while the other still shows Stripe's page can lead to a second subscription. The other tab can still pay until its next request expires the session, and the "already Pro" refusal covers only new sessions.
- A reused session keeps the first tab's locale and consent time.

### Terms as data (AGB)

- The AGB and the withdrawal information are plain data in `lib/legal/`, versioned by `TERMS_VERSION`.
- `/agb` renders them, German first, English below.
- The § 312f email carries the same text in full. That is why the text is a set of strings, not React nodes, and lives in `lib`: `billing` and the page both read it.
- The numbers in the text (the Free limits and the prices) are placeholders, filled from `billing/domain/limits`, so the terms cannot drift from the code.
- A change of meaning is a new version. The old text moves to `lib/legal/terms-archive/` with its values written out, so a confirmation always carries the version that was accepted.
- The provider's facts (`operator.ts`) moved to `lib/legal/` for the same reason: the confirmation names the provider (Art. 246a EGBGB).

### Contract confirmation (§ 312f)

- Sent once per subscription, using the "claim a business fact on the row" pattern (`docs/stripe-integration-plan.md`, section 5).
- The claim:
  - The sync reads the row through `tx` inside its lock.
  - For a live subscription that carries the consent in its metadata, it sets `confirmedSubscriptionId` with an `updateMany` that only a different or empty value matches.
  - `count === 1` sends.
- A subscription without consent metadata never gets one: it was bought before the order step. The migration also marks every existing subscription as confirmed, so a renewal of an older subscription cannot send a consent its customer never gave.
- After the commit, the email goes out through Resend with the idempotency key `contract-confirmation/<subscriptionId>`. It contains:
  - the provider;
  - the plan and the price;
  - the start date;
  - the consent with its time in Berlin;
  - the AGB and the withdrawal information in full.
- A failed send releases the claim. The next webhook or the daily reconciliation sends again; the key keeps a timeout that did deliver from sending twice.

### Cancellation button (§ 312k)

- "Verträge hier kündigen" is a plain link on every page:
  - the marketing footer;
  - the sign-in cards;
  - the user menu;
  - a footer under the app's main column, because on a phone the sidebar stays closed.
- The label is German in both languages, marked `lang="de"`.
- `/vertraege-kuendigen` is the one dynamic page of the legal group. It reads the session, so a signed-in user cancels without typing their contract. The link stays plain, so every other static page stays `○`.
- The form's labels are bilingual (German / English) like the legal pages. Its refusals are shown in both languages too.
- **Signed in:**
  - The page shows the contract: running with its renewal date, already ending, or none.
  - The consumer chooses an ordinary cancellation, or one for good cause with a reason.
  - `cancelOwnContract` sets `cancel_at_period_end` on the Stripe subscription at once, syncs it, and emails the confirmation.
- **Signed out:**
  - The form takes name, the account's email, the type and the reason.
  - The submission is the declaration.
  - The answer is the same for every address. The work runs in `after()`, so its timing says nothing either. This is the one entry point with a second call: the limit check, then the deferred processing.
  - The processing finds the account by email (`getUserIdByEmail` of `auth`, returning the id only; rule 4 of the architecture rules names this exception). If a subscription runs, it ends with the term. The confirmation goes to the address on file only.
- **Both:**
  - The screen then shows the declaration with its date and time, ready to print or save (§ 312k (3)).
  - The confirmation email (§ 312k (4)) states the time in Berlin and tells the holder how to resume in the portal if they did not send it.
  - A cancellation for good cause also goes to the operator's address with its reason.
- **Limits:** `cancel:ip` and `cancel:email` (HMAC identifiers):
  - A refusal shows "try again in N minutes". The limits count requests, not accounts, so the refusal reveals nothing.
  - When Upstash is down, the declaration is taken anyway: a consumer's cancellation must never be lost to our outage.
  - A failure of the deferred work goes to Sentry with ids only, and the full declaration goes to the operator's address to be finished by hand.
- **No declaration table:**
  - The screen record, the emails and Stripe's subscription carry what happened.
  - A table would hold personal data of people who may have no account, and would need its own retention rule.
- **Abuse:**
  - Anyone who knows an address can cancel that account's subscription at the period end.
  - It is never immediate, the holder is told at once, and resuming in the portal undoes it. The Customer Portal must allow reactivation (`docs/stripe-integration-plan.md`, section 7).

### Downgrade

- **Text read-only over the limit:**
  - Above `FREE_ITEM_LIMIT` items on Free (`textEditsAllowed` in `billing/domain/limits.ts`), the text of every item is read-only. At the limit or under it nothing changes.
  - Viewing, copying, searching, exporting and deleting stay. So do favourites, pins and collections.
  - `updateUserItem` accepts only an input whose text equals what is stored (`changesOnlyCollections`: the tags as a set, ignoring order and case). It ignores the AI claims of such a save and refuses any other change with `itemsReadOnlyOverLimit`.
  - `setUserItemAiContent` is refused too. Both call `userCanEditText`.
  - The edit form opens in a "collections only" mode (`editMode` next to `canUseAi`), with a note and a link to `/upgrade`.
- **Custom types of a former Pro user:**
  - They are kept, and their items stay visible.
  - Rename was already refused by `updateCustomType`.
  - `createUserItem` refuses a new item of one (`customTypesProOnly`). The type select and the type page's button show it disabled with the Pro badge.
  - Deleting an empty type stays open, since removing is never against the user.
- The AGB state these rules (section 7).

## Consequences

- Rule 4 of the architecture rules names `getUserIdByEmail` as an exception. The static-pages rule of the coding standards names `/vertraege-kuendigen`.
- A Pro checkout now needs Stripe Tax configured in the Dashboard. Without an origin address, Checkout refuses the session.
- The lawyer's list grows by:
  - Stripe's button label;
  - the reading of the signed-out form;
  - the wording of the consent;
  - the downgrade terms.
