# Before Live

What only a commercial launch needs: real money, a live Stripe key, a tax adviser's or a lawyer's sign-off, or real numbers. DevStash is a portfolio project that does everything a real product does, with Stripe on test cards; everything that can be built in test mode is a planned feature in `context/features/plan/`, not here.

Nothing new is written here unless it cannot be built at all (the rule is "Found work" in `context/ai-interaction.md`). CLAUDE.md does not import this file: read it before a commercial launch or when asked what a launch needs. Delete an item when it is done.

## Dated

- **AI Act Art. 50 (2) by 2026-12-02.** Decided without a lawyer and built in feature 15 ([ADR 0027](../docs/adr/0027-marking-ai-generated-output.md)): every saved AI output is flagged per field, marked in the markup and carried in the export. What stays here is the lawyer's check of that decision before live, including the two departures from the Code of Practice the ADR records: no watermark on long text (the optimized prompt, the Explain answer), and the export's marks not digitally signed (Sub-measure 1.1.1).

## Tax adviser

Researched only briefly on 2026-11-06, from secondary sources ([ADR 0014](../docs/adr/0014-launch-mode.md)). The code (Stripe Tax, gross EUR prices, tax ids in Checkout) is built in test mode by feature 19; these are the decisions it needs from an adviser.

- **VAT scheme.** The small-business scheme (§ 19 UStG) or regular VAT; the thresholds of § 19 and how it combines with the One-Stop Shop for consumers in other EU countries (above €10,000 of cross-border sales a year); reverse charge for EU businesses. Then the tax registrations in the live Stripe Tax settings.
- **The VAT id in the Impressum.** Needs the registration.

## Lawyer

Feature 19 writes these texts and flows in test mode; before live a lawyer signs them off.

- The terms (AGB, `lib/legal/terms.*.ts`), the withdrawal wording and the § 356 (5) BGB consent for the digital service, the order button (§ 312j BGB): ours says "Zahlungspflichtig bestellen" and opens Stripe, whose own button is labelled "Subscribe with obligation to pay"/"Kostenpflichtig abonnieren" (fixed in subscription mode) with a note beside it; is Stripe's label enough, or must the order be placed on our button (Payment Element, [ADR 0032](../docs/adr/0032-consumer-flow.md))
- The cancellation flow (§ 312k BGB), in particular that a signed-out cancellation takes effect on submission with the confirmation sent to the address on file, that it ends the subscription at the period end, that the German label is linked on every page, that the declaration is kept only in the emails, at Stripe and on the consumer's screen, and the abuse case of a stranger cancelling someone's subscription ([ADR 0032](../docs/adr/0032-consumer-flow.md))
- The contract confirmation on a durable medium (§ 312f BGB): what it must carry
- The signed-out cancellation's confirmation: it goes out only when a running contract was ended, at most once a day per account, and carries none of the visitor's free text; whether a declaration against an account with no running contract still needs one
- The failed-payment policy: whether two weeks of arrears supports ending the contract; the AGB now say so (section 6, [ADR 0033](../docs/adr/0033-tax-prices-and-payment-policy.md))
- The downgrade terms: text read-only over the Free limit, custom types kept read-only (AGB section 7)
- The AI Act decision of feature 15
- § 25 TDDDG (feature 20, [ADR 0034](../docs/adr/0034-consent-and-field-measurement.md)): the Sentry browser SDK runs without consent, counted as strictly necessary because it reports only a failure of the service the visitor asked for; and the banner's wording, the log retention named for the Web Vitals, and Allow and Decline as equal buttons

## Vendors and privacy

- **Vendor facts in the privacy notice are unconfirmed.** In `docs/privacy/processing-record.md` the DPA (accepted, date), the transfer mechanism (DPF or SCCs) and the region of Vercel, Neon, R2, OpenAI, Stripe, Resend and Upstash are still `⟦OPERATOR⟧`. The owner chose not to research them on 2026-11-11 (portfolio project), so `_legal/datenschutz/vendors.*.tsx` words them as what each provider's terms offer. Accept each DPA as the operator, confirm the facts, and make that wording exact.

## Switching Stripe to live

- **The live key and the test-mode sentences.** The privacy notice (`_legal/datenschutz/general.*.tsx`, "About this service", the billing item, and the Stripe and retention texts) says Stripe runs in test mode. They are static, unlike the homepage hint, which follows the key. Rewrite them in the same change that switches to a live key, together with the retention and legal basis of the data kept under tax law ([ADR 0014](../docs/adr/0014-launch-mode.md)).
- **The live Dashboard settings.** Smart Retries, the failed-payment emails and the authentication-link email, the customer portal: set and checked by hand in live mode, since a test clock proves only the sandbox (`docs/archive/stripe-integration-plan.md`, section 5).
- **Live payment methods.** Test mode sells with cards only (feature 19). SEPA Direct Debit and PayPal are common in Germany, but SEPA settles late and can be reversed: turn them on only with the processing state decided (Pro while the payment is pending or not, what a late failure revokes) and tested in the sandbox first.

## Real numbers

- **Signed-out cancellations a day.** Anyone who knows an address can end that account's subscription at the period end (ADR 0032). Once there is traffic to compare with, add an alert on the daily count of signed-out cancellations, so a run against many accounts is seen.

- **The homepage has no social proof.** No testimonials, user counts or logos. Only real numbers: a strip under the hero once there are some; until then "Free forever · 50 items · no card" is honest.

## Watch

Not work a feature can finish: each waits for an outside release or event. Check when the trigger happens.

- **`dompurify` in the audit.** `npm audit --omit=dev` reports `dompurify` (critical) through `monaco-editor`. Since 2026-11-04 the app serves Monaco itself, so this code runs in production: 0.57.0, the latest stable release on that date, pins and bundles `dompurify` 3.4.15, and `npm audit fix` cannot change a bundled copy. Trigger: a `monaco-editor` release with a fixed version. Change the exact version in `package.json`; the copy script and the path follow it.
- **`glob` in the audit, through Storybook.** `npm audit` reports `glob` 13 (moderate, GHSA-3g3m-2fjr-6pw4) through `@storybook/nextjs-vite` → `@storybook/react-vite` → `@joshwooding/vite-plugin-react-docgen-typescript` 0.7. A dev-only build tool that reads our own files, never in production; Storybook 10.6.7, the latest on 2026-11-14, pins the plugin at `^0.7.0`, and an `overrides` to `glob` 14 would be a major under it. Trigger: the Storybook release that moves the plugin on (the `storybook` Dependabot group, ADR 0026).
- **ESLint 9 to 10.** The Vercel build warns `deprecated eslint@9.39.5`. Lint only, the deployed app is not affected. Trigger: the plugins `eslint-config-next` pulls in (react, react-hooks, import, jsx-a11y) declare eslint 10. Then, on its own `chore/` branch: upgrade, confirm `npm run lint` still fails on a deliberate boundary violation and an import cycle, run tsc, the tests and the build. A half-working upgrade could silently switch the architecture checks off.
- **A wrapped Auth.js error may reach Sentry under a one-letter name.** `auth-logger.ts` names Auth.js's own error by its `type`, but when Auth.js wraps another error (`CallbackRouteError`, `AdapterError`) the inner one is reported as it is, and a bundled package such as `oauth4webapi` may have its class names minified. Trigger: the first Sentry event of that kind; if the name is short, `safeError` falls back to the `code`.
