# 0014. Launch mode: portfolio mode, and the legal pages that go with it

- Status: accepted
- Date: 2026-11-11

Facts about laws and vendors below are **as of 2026-11-11**, each with its source. This is engineering documentation, not legal advice. A fact that changes later is a new record, not an edit of this one.

## Context

DevStash is public. Anyone can register (email and password, or GitHub), a pricing page sells Pro through Stripe, and an item's content goes to OpenAI when a user clicks an AI button. Germany expects a provider identification (Impressum) and, from the first account, the information of Art. 13 GDPR (Datenschutzerklärung), whether or not any money moves. The footer showed "Privacy" and "Terms" as text with no pages behind them, and `docs/ai-integration-plan.md` already said a privacy page is needed before live mode.

Stripe runs on a test key. Nobody can pay for real, and the project is a portfolio piece, not a business.

## Options

1. **Commercial launch now.** Terms (AGB), a withdrawal notice, the cancellation button, EUR prices with VAT, a tax decision, Stripe in live mode. Months of legal and tax work for no revenue.
2. **Portfolio mode with real legal pages.** Stripe stays in test mode and the site says so. The Impressum and the privacy notice are written as if live, because the collection of personal data starts with the first account, and they show a reviewer that the author knows the rules.
3. **No legal pages until launch.** Cheapest, but the site already stores emails and sends content to a US vendor, so Art. 13 applies today.

## Decision

Option 2.

- Stripe stays on a test key. The pricing section shows `TestModeHint` when `isStripeTestMode()` is true, decided when the page is built. Switching to a live key therefore removes the notice by itself, instead of leaving a false "no real charges" on a live site. `/upgrade` and the billing section already show the same hint.
- `/impressum` and `/datenschutz` are static pages in `src/app/(marketing)/`, German first and English below, with no data and no logic. The operator's facts are in one file, `_legal/operator.ts`; while any of them is a placeholder (`⟦OPERATOR: …⟧`), a production build fails, so a draft cannot go live by accident.
- The vendors, the data they receive, their regions and the transfer mechanisms are in `docs/privacy/processing-record.md`. The privacy notice is written from it, and a vendor missing from either language fails the typecheck.
- Regions are documented, not changed. The Neon project is in `us-east-2` and a Neon region cannot be changed in place; moving a vendor to the EU is a separate decision of the owner and would change the database hosts and branch ids in `CLAUDE.md` and the scripts.

### Which law requires the Impressum

§ 5 DDG applies to digital services that are usually offered for payment; § 18 (1) MStV is the fallback for offers that are not (and § 18 (2) adds a responsible person only for journalistic-editorial content, which DevStash has none of). DevStash offers a priced plan, so the decision is to treat § 5 DDG as applicable. That is also the safe side: its list is a superset of § 18 (1) MStV (name and address). The page gives:

- name and the address where the provider is established (§ 5 (1) Nr. 1)
- an email address and a second means that allows fast electronic contact and direct communication (§ 5 (1) Nr. 2). The statute asks for "schnelle elektronische Kontaktaufnahme und unmittelbare Kommunikation"; case law (CJEU C-298/07, cited from memory and not re-checked here) and practice read this as an email address plus a second means such as a telephone number or a contact form. An email address alone is the common cause of warning letters
- the VAT id (Nr. 6) and register entry (Nr. 4) **only if they exist**; supervisory authority (Nr. 3) and professional rules (Nr. 5) do not apply

Sources: [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html) (read 2026-11-11); practice guides disagree on private sites with no commercial link, which is why this record does not rely on the § 18 exemption: [e-recht24](https://e-recht24.de/impressum/13074-pflichtangaben-im-impressum.html), [IHK Köln](https://www.ihk.de/koeln/hauptnavigation/recht-steuern/impressum-pflichtangaben-auf-Webseites-5271690).

### AI Act, Art. 50 (transparency)

- **Applies from 2 August 2026.** The Digital Omnibus on AI (Regulation (EU) 2026/1744, in force 27 July 2026 according to the secondary sources below) postponed the high-risk rules (Annex III to 2 December 2027, Annex I to 2 August 2028) and left Art. 50 as it was, with one grace period: machine-readable marking under Art. 50 (2) for generative systems placed on the market before 2 August 2026 is due by **2 December 2026**. Older articles that call the postponement "proposed" are out of date.
- **Role.** OpenAI provides the model. DevStash puts an AI system built on it into service under its own name (the tag, summary, explain and optimize functions), so for Art. 50 it is treated as a **provider** of that system, and a deployer of OpenAI's model.
- **Art. 50 (1)**, telling people they are interacting with an AI: there is no chat or conversation. The user starts each function with a button labelled "Generate with AI", "Explain" or "Optimize", so the use of AI is obvious. The note "Content is sent to OpenAI when you click." stands with every one of those buttons (under the tags and description fields, under the editor for Explain and Optimize) and is the button's accessible description; the privacy notice has a section on it.
- **Art. 50 (4)**, disclosing AI-generated text published on matters of public interest: not applicable; results are shown to the account owner only.
- **Art. 50 (2)**, machine-readable marking of synthetic text: **open.** Whether short tag lists and one-line summaries fall under the exception for assistive functions that do not substantially alter the input, and what marking would mean for text a user then edits and saves, is a question for the operator or a lawyer. Nothing is built for it. Because DevStash's AI functions existed before 2 August 2026, the deadline to settle it is 2 December 2026, recorded in `context/todo.md`.

Sources (secondary, to be confirmed against EUR-Lex before relying on them): [Usercentrics](https://usercentrics.com/knowledge-hub/eu-ai-act-high-risk-delay-article-50-transparency-consent/), [Future of Privacy Forum](https://fpf.org/blog/the-ai-act-implementation-timeline-what-changes-under-the-ai-omnibus/), [Technology Org](https://www.technology.org/2026/10/13/eu-ai-act-deadlines-after-the-digital-omnibus-what-applies-from-december-2026-to-august-2028/).

### Transfers to the United States

Every vendor is in or reachable from the US. The mechanisms (EU-US Data Privacy Framework, or standard contractual clauses in the vendor's DPA) are listed per vendor in the processing record. The General Court upheld the DPF on 3 September 2025 (Latombe v Commission, T-553/23); the appeal, C-703/25 P, was still pending in the sources below with no judgment, so the standard contractual clauses are the fallback to keep in each DPA. Sources: [WilmerHale](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework), [Vercel's DPF page](https://vercel.com/guides/is-vercel-certified-under-dpf).

### What a commercial launch adds (listed, not built)

Before Stripe goes to live mode (also in `context/todo.md`, "Germany: tax and legal"):

- the cancellation button of § 312k BGB ("Verträge hier kündigen") and a confirmation page
- terms (AGB), the withdrawal notice and the waiver for digital services (§ 356 BGB), the order button wording of § 312j BGB
- prices in EUR including VAT; the VAT decision (§ 19 UStG small-business rule or regular VAT, One-Stop Shop, Stripe Tax)
- the Impressum gains the VAT id and any trade registration; the privacy notice gains the legal basis for the contract data kept for tax law
- every DPA accepted and dated in the processing record; the hint on the pricing section disappears with the test key
- the sections that say Stripe runs in test mode ("About this service" in the privacy notice, both languages) are rewritten for live payments, and the notice gains the legal basis and the retention for the data kept under tax law

## Consequences

- Adding, removing or moving a vendor means changing `docs/privacy/processing-record.md`, the `VENDORS` list and both language files of the privacy notice in the same change.
- The legal text is a draft until the operator approves it. The build guard covers the provider's facts in `operator.ts` only: a placeholder there fails a production build. What the notice asserts about the vendors (that a DPA exists with each, the transfer mechanism, the regions) is not machine-checked; the owner confirms it against the processing record before the merge.
- The pages are built at deploy time, and a preview build is not rebuilt when it is promoted to production, so a preview with placeholders must never be promoted. After the first production deploy, check the built homepage for the demo hint: it is decided from `STRIPE_SECRET_KEY` at build time and disappears silently if the key is missing from the build environment.
- Sentry (feature 6) is in the record as planned and not in the published notice; enabling it, or any analytics, changes the cookie and consent position and needs a new record.
- The static pages cost nothing at runtime. `Navbar` and `Footer` move to a `(marketing)/layout.tsx` so a signed-in visitor does not see the header flash between the homepage and the legal pages.
