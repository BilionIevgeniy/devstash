# Feature plan

Features planned after the course, in implementation order. Each file is self-contained: load one file into `/feature load`, then follow the normal workflow in `context/ai-interaction.md` (plan review by `architecture-reviewer`, tests, `code-reviewer`, commit only when green).

Rules that apply to every file:

- `context/architecture-rules.md` and `context/coding-standards.md` win over anything written here. If a step here conflicts with them, the plan review decides, and a changed rule gets an ADR.
- Check every library API against the installed version first (`node_modules/next/dist/docs/`, the package's `.d.ts`, or Context7), never memory. The links under "Read first" are the starting point, not a replacement for that check.
- When a feature is merged, tick it in the table below and add it to `context/feature-history.md` as usual.

| # | Feature | Priority | Status |
|---|---|---|---|
| 1 | [CI and safe migrations](1.ci-and-safe-migrations.md) | MUST | [ ] |
| 2 | [Legal pages and privacy](2.legal-pages-and-privacy.md) | MUST | [ ] |
| 3 | [Component tests with React Testing Library](3.component-tests-rtl.md) | MUST | [ ] |
| 4 | [Tenant isolation integration tests](4.tenant-isolation-integration-tests.md) | MUST | [ ] |
| 5 | [E2E smoke tests](5.e2e-smoke.md) | MUST | [ ] |
| 6 | [Observability](6.observability.md) | MUST | [ ] |
| 7 | [URL filters and sort](7.url-filters-and-sort.md) | MUST | [ ] |
| 8 | [Server search with debounce](8.server-search-with-debounce.md) | MUST | [ ] |
| 9 | [Hooks, forms and editor focus](9.hooks-forms-and-editor-focus.md) | SHOULD | [ ] |
| 10 | [Import and export](10.import-export.md) | MUST | [ ] |
| 11 | [English and German (i18n)](11.i18n-en-de.md) | SHOULD | [ ] |
| 12 | [Client data and infinite lists](12.client-data-and-infinite-lists.md) | SHOULD | [ ] |
| 13 | [Performance and SEO](13.performance-and-seo.md) | SHOULD | [ ] |
| 14 | [Storybook and accessibility](14.storybook-and-a11y.md) | SHOULD | [ ] |
| 15 | [Full E2E suite](15.e2e-full.md) | MUST before 16 | [ ] |
| 16 | [Cache Components](16.cache-components.md) | SHOULD, last | [ ] |

Deferred on purpose (in `context/todo.md`, not planned here): custom item types.

**Dependencies:** 4 defines the test database used by 5 and 15 · 5 needs 2 and 4 · 6 needs 2 · 7 needs 3 · 12 needs 7 and 8 · 14 needs 3 and 11 · 16 needs 11 and 15.

## Cross-file decisions (settled before implementation)

1. **Locale and static pages (2, 11, 16).** The root layout never reads cookies or headers, so public pages can stay static. Legal pages (`/impressum`, `/datenschutz`) are one static page each with German first and English below. The marketing page is static in two versions, `/` (English) and `/de` (German), rendering the same components with an explicit locale. The language cookie applies only to the auth pages and the app. `<html lang="en">` stays in the root layout; pages in another language set `lang` on their top wrapper element (`<div lang="de">`). Recorded in an ADR in feature 11.
2. **Test database (4, 5, 15).** Feature 4 defines it once: `TEST_DATABASE_URL` (a local Postgres or a Neon branch that is neither `development` nor `production`), a `requireTestDatabase` guard next to `requireDevDatabase` in `scripts/require-dev-database.ts`, a test seed that creates a Free and a Pro user (with a `Subscription` row), and which vendors are mocked or need test credentials.
3. **List URL contract (7, 12).** Sort values are the existing `FAVORITE_ITEM_SORTS` (`newest|oldest|a-z|z-a|type`, from `features/items/domain/favorite-sort.ts`) and their subsets. `/favorites` and `/pinned` get no `page` parameter, because feature 12 makes them cursor-based lists.
4. **Search (8, 12).** Feature 8 replaces the search index; feature 12 does not touch search.
5. **ADRs that are required, not optional:** raw-SQL placement for search (8), import as batched data input (10), next-intl outside `lib` and the locale decision (11), caching strategy (16).
6. **CI environment (1, 4, 5, 15):** every spec that adds a CI job lists which secrets are real (test-only) and which are dummies.

## Relation to `context/todo.md`

`/feature complete` deletes the todo items a feature finished. Items these features finish or touch:

| Todo item | Feature |
|---|---|
| Pro features: Custom item types | stays deferred; feature 2 marks it "coming soon" on the pricing page |
| Pro features: Export (JSON / ZIP) | 10 builds JSON export; feature 2 drops "ZIP" from the pricing text |
| Germany: tax and legal (VAT, § 312k button, withdrawal, payment methods) | stays deferred (commercial launch); feature 2's ADR "Launch mode" points to it. Its "privacy policy and imprint" part is done by feature 2 |
| UI review: homepage footer dead links | 2 (adds Privacy/Imprint, hides links without pages) |
| Security: `GET /api/search` has no rate limit and ignores an abort | 8 |
| Search: the palette searches only 1000 items | 8 |
| Tests: React Testing Library | 3 (the item drawer states named there are the first candidates) |
| UI review: last feature, a full Playwright pass | 15 automates the main journeys; the manual pass over every screen stays in the todo |
| Items: focus does not return after the route drawer closes | not fixed by the plan; feature 5 does not assert it |
| Security: script/style CSP, unclaimed uploads, `dompurify`; Tooling: ESLint 10; Items: cards as links, signed-out delete; Database items; touch targets and other UI review items | not in this plan; stay in the todo |

**Main features** (implement before the deep-dive learning on them starts): 1–8 and 10. Features 9 and 11–16 follow one by one.
