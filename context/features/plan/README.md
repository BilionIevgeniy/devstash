# Feature plan

Features planned after the course, in implementation order. Each file is self-contained: load one file into `/feature load`, then follow the normal workflow in `context/ai-interaction.md` (plan review by `architecture-reviewer`, tests, `code-reviewer`, commit only when green). A feature is one PR with named commits inside; `/feature load` moves its spec from this folder to `context/features/`.

DevStash is a portfolio project that does everything a real product does; the only difference is that Stripe runs on test cards. So everything a real shop has is a feature here, built in test mode. What only a commercial launch needs (real money, a live key, a tax adviser or a lawyer) is in `context/todo-before-live.md`.

Rules that apply to every file:

- `context/architecture-rules.md` and `context/coding-standards.md` win over anything written here. If a step here conflicts with them, the plan review decides, and a changed rule gets an ADR.
- Check every library API against the installed version first (`node_modules/next/dist/docs/`, the package's `.d.ts`, or Context7), never memory. The links under "Read first" are the starting point, not a replacement for that check.
- Every feature writes the E2E journeys of the pages and routes it changes; feature 21 adds only what no feature owned.
- Work found during a feature is done in that feature ("Found work" in `context/ai-interaction.md`); work too large or off-topic goes into the Scope of the matching spec below, or a new spec.
- When a feature is merged, tick it in the table below and add it to `context/feature-history.md` as usual.

| #   | Feature                                                                          | Priority            | Status |
| --- | -------------------------------------------------------------------------------- | ------------------- | ------ |
| 1   | [CI and safe migrations](../1.ci-and-safe-migrations.md)                         | MUST                | [x]    |
| 2   | [Legal pages and privacy](../2.legal-pages-and-privacy.md)                       | MUST                | [x]    |
| 3   | [Component tests with React Testing Library](../3.component-tests-rtl.md)        | MUST                | [x]    |
| 4   | [Tenant isolation integration tests](../4.tenant-isolation-integration-tests.md) | MUST                | [x]    |
| 5   | [E2E smoke tests](../5.e2e-smoke.md)                                             | MUST                | [x]    |
| 6   | [Observability](../6.observability.md)                                           | MUST                | [x]    |
| 7   | [URL filters and sort](../7.url-filters-and-sort.md)                             | MUST                | [x]    |
| 8   | [Server search with debounce](../8.server-search-with-debounce.md)               | MUST                | [x]    |
| 9   | [Hooks, forms and editor focus](../9.hooks-forms-and-editor-focus.md)            | SHOULD              | [x]    |
| 10  | [Import and export](../10.import-export.md)                                      | MUST                | [x]    |
| 11  | [English and German (i18n)](../11.i18n-en-de.md)                                 | SHOULD              | [x]    |
| 12  | [Client data and infinite lists](../12.client-data-and-infinite-lists.md)        | SHOULD              | [x]    |
| 13  | [Performance and SEO](../13.performance-and-seo.md)                              | SHOULD              | [x]    |
| 14  | [Storybook and accessibility](../14.storybook-and-a11y.md)                       | SHOULD              | [x]    |
| 15  | [AI output marking](../15.ai-output-marking.md)                                  | MUST, by 2026-12-02 | [x]    |
| 16  | [Codebase hygiene](../16.codebase-hygiene.md)                                    | SHOULD              | [x]    |
| 17  | [Security, auth and data retention](../17.security-auth-retention.md)            | MUST                | [x]    |
| 18  | [Custom item types](../18.custom-item-types.md)                                  | MUST                | [x]    |
| 19  | [A real shop in test mode](../19.real-shop-in-test-mode.md)                      | MUST                | [x]    |
| 20  | [UX, accessibility and consent](../20.ux-a11y-and-consent.md)                    | SHOULD              | [x]    |
| 21  | [Full E2E suite](../21.e2e-full.md)                                              | MUST before 22      | [x]    |
| 22  | [CSP and Cache Components](../22.csp-and-cache-components.md)                    | SHOULD              | [x]    |
| 23  | [Pre-show hardening](../23.pre-show-hardening.md)                                | MUST                | [ ]    |
| 24  | [Functions and database closer to the users](24.region-closer-to-users.md)       | SHOULD              | [ ]    |
| 25  | [Final review pass](25.final-review-pass.md)                                     | SHOULD, last        | [ ]    |

**Dependencies:** 4 defines the test database used by 5 and 21 · 5 needs 2 and 4 · 6 needs 2 · 7 needs 3 · 12 needs 7 and 8 · 14 needs 3 and 11 · 16 runs with no other branch open · 18 needs 17 live (the drop of the `@ignore`d columns) · 19 needs 17 (cron dispatcher, HMAC rate limits) and 18 (downgrade of custom types) · 20 needs 16 (one stats component) · 21 needs 15–20 (UI before the baselines) · 22 needs 21 · 23 needs 22 (its tests come before its refactors, commit by commit) · 24 needs 23 · 25 needs all.

## Order principles

1. **The deadline first**: 15 ends on 2026-12-02 (AI Act Art. 50 (2)).
2. **Hygiene before the large features**: 16's sweep and folder moves conflict with every open branch, so they come before the features that touch many files.
3. **Expand before contract**: 17 deploys `@ignore` on the superseded columns, 18 drops them in a later deploy.
4. **UI before the baselines**: every change of what the screen looks like (18, 19, 20) lands before 21 commits its screenshots.
5. **CSP with Cache Components**: a nonce-based CSP makes every page dynamic, so 22 picks a static-compatible policy and lands it before the caching.

## Cross-file decisions (settled before implementation)

1. **Locale and static pages (2, 11, 20, 22).** The root layout never reads cookies or headers, so public pages can stay static. Legal pages (`/impressum`, `/datenschutz`, the AGB of 19) are one static page each with German first and English below. The marketing page is static in two versions, `/` (English) and `/de` (German). The language cookie applies only to the auth pages and the app. Whatever needs words on every page (the `Toaster`, the consent banner) is mounted per provider layout, never in the root. Recorded in ADR 0024.
2. **Test database (4, 5, 21).** Feature 4 defines it once: `TEST_DATABASE_URL`, the `requireTestDatabase` guard, a test seed with a Free and a Pro user, and which vendors are mocked.
3. **List URL contract (7, 12).** Sort values are the existing `FAVORITE_ITEM_SORTS` and their subsets. `/favorites` and `/pinned` get no `page` parameter.
4. **Search (8, 12, 18).** Feature 8 replaced the search index; 18 adds custom types to it.
5. **ADRs that are required, not optional:** raw-SQL placement for search (8), import as batched data input (10), next-intl outside `lib` and the locale decision (11), the AI Act marking (15, addendum to 0014), the cron dispatcher and retention periods (17), custom types (18), the consumer flow and the tax and payment policy (19), consent and field measurement (20), the CSP and the caching strategy (22).
6. **CI environment (1, 4, 5, 21):** every spec that adds a CI job lists which secrets are real (test-only) and which are dummies.
7. **One cron (17, 19).** Vercel cron calls one dispatcher route behind `CRON_SECRET`, daily at most on Hobby; each job is idempotent and logs counts and ids only.
8. **New secrets** (`RATE_LIMIT_HASH_KEY`, `CRON_SECRET`, the EUR price ids): a line in `.env.example` and in the map of `scripts/e2e-server-env.ts`, and a value in every Vercel environment, which the user sets.

## Where the former `context/todo.md` went

The deferred list was split on 2026-11-14. Accepted ADRs and historical specs that still name `context/todo.md` mean this split.

| Former section                                                                                     | Now                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pro features: custom item types                                                                    | 18                                                                                                                                                           |
| Billing: Stripe phase 2 checks, webhook reconciliation                                             | 19                                                                                                                                                           |
| Germany: tax and legal                                                                             | the code in test mode in 19; the adviser's and lawyer's sign-off, vendor facts, live key and live payment methods in `todo-before-live.md`; the AI Act in 15 |
| Auth (bcrypt bytes, old GitHub tokens, GitHub-only delete, expired tokens and unverified accounts) | 17                                                                                                                                                           |
| Security: resend enumeration, HMAC identifiers, unclaimed uploads                                  | 17                                                                                                                                                           |
| Security: CSP                                                                                      | 22                                                                                                                                                           |
| Security: `dompurify`, `glob`                                                                      | Watch in `todo-before-live.md`                                                                                                                               |
| Observability: egress check, Next.js log messages                                                  | 22                                                                                                                                                           |
| Observability: real-user Web Vitals                                                                | 20                                                                                                                                                           |
| Observability: wrapped Auth.js error name                                                          | Watch in `todo-before-live.md`                                                                                                                               |
| Observability: browser events without OS                                                           | Known risks in `docs/architecture.md`                                                                                                                        |
| Items: cards as links, hover, focus return, inline form errors, `/profile` loading                 | 20                                                                                                                                                           |
| Items: read-only over the Free limit                                                               | 19                                                                                                                                                           |
| Items: endless lists at 500 rows; Database: production latency                                     | 22                                                                                                                                                           |
| Collections, Database: full content in lists                                                       | Known risks in `docs/architecture.md`                                                                                                                        |
| Database: schema without migration                                                                 | 16                                                                                                                                                           |
| Database: Neon branch per preview                                                                  | dropped (ADR 0013 records the upgrade path)                                                                                                                  |
| Database: drop the superseded columns                                                              | 17 (`@ignore`) and 18 (drop)                                                                                                                                 |
| Demo data                                                                                          | 16 (seed), the README (the seed differs on purpose)                                                                                                          |
| Tooling: Prettier, CI build cache, copy-paste, crowded folders                                     | 16                                                                                                                                                           |
| Tooling: ESLint 10                                                                                 | Watch in `todo-before-live.md`                                                                                                                               |
| Tests: mutation check                                                                              | 25                                                                                                                                                           |
| Tests: `useItemFavorites`, own Upstash database, change-password journey                           | 21                                                                                                                                                           |
| Languages: the root `Toaster`                                                                      | 20                                                                                                                                                           |
| UI review: full Playwright pass                                                                    | 25                                                                                                                                                           |
| UI review: the other findings                                                                      | 20 (the palette axe violations were fixed in 14)                                                                                                             |
| UI review: social proof                                                                            | `todo-before-live.md`                                                                                                                                        |
| UI review: an email link for another account                                                       | 17                                                                                                                                                           |
