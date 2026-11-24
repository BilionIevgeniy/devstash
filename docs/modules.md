# Modules

The catalogue of DevStash's modules: what each one owns, what it uses and what the rest of the code may import from it. It does not repeat the ranks. The numbers live in `FEATURE_RANKS` in `eslint.config.mjs` and in the table "Ranks" in [context/architecture-rules.md](../context/architecture-rules.md), and a module may use any module of a lower rank. The rules for adding a module are in [architecture.md](architecture.md).

A section says what a module owns and its public entry points by folder; what a file does is in the file. The names stand for paths inside `src/features/<module>/`, and everything in `_internal/` is private, so it is not listed. A new file that another module or `app/` imports gets its name here; what only the module uses does not.

A module gets its section in the commit with its first real code, together with its `FEATURE_RANKS` row. `/cleanup` checks that every folder of `src/features` has one.

## Who owns which model

| Model                                     | Owner         | Note                                                                                                                                                                       |
| ----------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User, Account, Session, VerificationToken | `auth`        |                                                                                                                                                                            |
| ItemType                                  | `item-types`  |                                                                                                                                                                            |
| Item, Tag, ItemTag, ItemCollection        | `items`       | `Tag` becomes its own module only when a second feature needs it; the link to collections is written with the item ([ADR 0008](adr/0008-items-own-the-collection-link.md)) |
| Collection                                | `collections` |                                                                                                                                                                            |
| Subscription                              | `billing`     | `isPro` is derived from the subscription status; no row means the Free plan                                                                                                |
| UserPreference                            | `editor`      | One row per user, typed columns, an absent row means defaults, created by upsert                                                                                           |

A module writes only the models it owns and reads only its own models. A relation `select` of scalar columns through its own relation is fine (`items` selects the type name, icon and color through `Item.type`, and the id and name of each collection through `Item.collections`). Everything else goes through the owner's queries or services.

## Existing modules

### auth

- **Owns:** the identity and the session: sign-in (password, GitHub), registration, email verification, password reset and change, the switch between accounts (`/switch-account`); the tokens of `VerificationToken` and their retention; the proof and the rows of an account deletion (the flow is `account`'s); which registrations are stale (never verified within 7 days)
- **`nextauth/`:** `session` (`getSessionUser` redirects a signed-out caller, `getSignedInUserId` answers null for routes), `auth` (the handlers, `signIn`, `signOut`), `auth.config` (for `proxy.ts`)
- **`services/`, `queries`:** `registration`, `account`, `account-deletion-link`, `retention`. A verified deletion (`VerifiedDeletion`) can only be built by the proof checks of `account`, and the delete of the rows takes nothing else. `queries` reads by an email alone only in `getUserIdByEmail`, for the § 312k cancellation of `billing` ([ADR 0032](adr/0032-consumer-flow.md)); reads that return a secret are private ([ADR 0009](adr/0009-read-write-split-enforced-by-lint.md))
- **`domain/`, `schemas`:** paths, token and link rules, rate limit policies, the account switch
- **`components/`:** the forms and cards of the auth pages, `UserAvatar`, `GitHubAuthSection`; `hooks/use-has-session` (a static page learns of the session, for display only, never for access); what a new document after the end of a session needs (`leave-session`, `hooks/use-sign-out`, `hooks/use-reload-on-restore`, `app-shell-document`, `FreshAuthDocument`, [ADR 0037](adr/0037-caching-strategy.md))
- **Uses:** `lib` only

### billing

- **Owns:** `Subscription` and the entitlements (the plan, the Free limits, the text lock over them), read through `getEntitlements` and never from the JWT or the session ([ADR 0011](adr/0011-past-due-grace-and-no-event-table.md)); Checkout, the portal and the sync with Stripe (webhook, return from Checkout, daily reconciliation, [ADR 0033](adr/0033-tax-prices-and-payment-policy.md)); the consumer flow (order step, § 312f confirmation, § 312k cancellation, [ADR 0032](adr/0032-consumer-flow.md)); the pricing table of the homepage and `/upgrade`; the end of the billing of a deleted account
- **`queries`:** `getEntitlements`, `getBillingOverview`, `getContractState`. A user with no row is on the Free plan
- **`services/`:** `webhook` (the route), `customer` (for `account`), `reconciliation` (the cron route). Every write of a row goes through the one sync, scoped by the customer ([ADR 0012](adr/0012-webhook-writes-scoped-by-customer.md))
- **`domain/`:** `limits`, `upgrade` (`UPGRADE_PATH`), `terms` (the numbers of the AGB)
- **`components/`:** the pricing parts, `BillingSection`, `ProUpgradePanel`, `CancelContractForm`, `ProBadge`, `PlanBadge`, `TestModeHint` (shown while Stripe runs on a test key)
- **Uses:** `auth`

### item-types

- **Owns:** `ItemType`: the system types and the custom types of Pro users ([ADR 0031](adr/0031-custom-item-types.md)): their names, slugs, colors and icons, the cap of 50, their settings section
- **`queries`, `services/custom-types`:** the types of a user; create, update and delete behind a lock, with the Pro check in the service
- **`domain/`:** `item-type` (labels, slugs, `typePagePath`, row to `ItemTypeInfo`), `custom-type` (the rules and the palette), `rank-types-by-usage`
- **`components/`:** `TypeIcon`, `CustomTypesSection` (the settings page hands it the Query sync of items)
- **Uses:** `auth`, `billing`

### files

- **Owns:** no model; the objects in R2 under `users/<userId>/` ([ADR 0004](adr/0004-direct-upload-to-r2.md)): the file rules (by extension, never the browser's `File.type`), the key scheme, the presigned upload and its confirmation, signed downloads, deletion, the age of an unclaimed upload. The vendor client is `lib/vendors/r2.ts`
- **`services/objects`:** confirm, sign, delete, purge, and the listing for the daily sweep of `items`. The caller checks that a key belongs to the user before it asks for a URL; a URL is signed for a whole window, so it repeats and the browser caches the image
- **`domain/file-rules`, `types`:** kinds, sizes, icons; `UploadedFile`, `FileUrls`
- **`components/`:** `FileUpload` (the browser PUTs straight to R2, aborted on unmount, failed when it stalls), `FileTypeIcon`, `hooks/use-file-size`
- **Uses:** `auth`, `billing`

### items

- **Owns:** `Item`, `Tag`, `ItemTag`, `ItemCollection` ([ADR 0008](adr/0008-items-own-the-collection-link.md)): create, read, update, delete, favorite and pin; the cards, rows, lists and the drawer; the create dialog; the endless lists of `/favorites` and `/pinned` and the browser's cache of item data ([ADR 0025](adr/0025-client-data-with-tanstack-query.md)); the AI marks of an item ([ADR 0027](adr/0027-marking-ai-generated-output.md)); the sweep of uploads no item holds
- **`queries/`:** `dashboard`, `sidebar`, `type-page`, `lists`, `search` ([ADR 0018](adr/0018-search-in-postgres.md)), `import`. The reads that return the object key are private
- **`services/`:** reads that check the plan or sign uploads (`item-detail`, `gallery`, `file-list`, `collection-listing`, `locked-files`, `type-access`), writes (`create-item`, `item`), `export`, `upload-sweep`. `openUserItem` and `openUserItemOfType` answer `ok`, `locked` or `missing`, and nothing is signed before the plan is checked
- **`domain/`, `schemas`, `types`:** the fields and content of each type, the URL state and cursors of the lists, the search text
- **`components/`:** `cards/`, `lists/`, `drawer/` (the dashboard, collection and endless lists open the drawer from the Query cache; a type page opens it as an intercepted route), `CreateItemDialog`, `item-queries` with `hooks/use-item-queries`: every client caller of an action that changes items or collections awaits its sync
- **Uses:** `auth`, `billing`, `item-types`, `files`, `editor`, `ai`

### collections

- **Owns:** `Collection`: create, update, delete (its items stay) and favorite; its cards, dialogs and colour (the accent of its most used type)
- **`queries/`:** `dashboard`, `list`, `sidebar`, `favorites`, `search`, `import`, `export`. `/collections/[id]` adds the items through `getUserCollectionListing` of `items`
- **`services/collection`, `schemas`, `types`:** the create service and schema also take the import
- **`domain/`:** `collection-accent`, `favorite-sort` (its name order is `compareNames` of `lib/utils`)
- **`components/`:** `CollectionCard`, `CollectionGridSkeleton`, `CreateCollectionDialog`, `CollectionHeaderActions`, `CollectionRowFavorite`
- **Uses:** `auth`, `billing`, `item-types`, `items`

### editor

- **Owns:** `UserPreference` and the editor preferences; the editors of item content: `CodeEditor` (Monaco, served from `public/monaco/`, a plain textarea when it fails to load) and `MarkdownEditor`; the Markdown preview (no raw HTML, images only when asked for); the languages and their picker
- **`components/`:** the two editors, `MarkdownPreview`, `LanguageSelect`, `EditorPreferencesProvider` (around the shell, whose dialogs hold editors), `EditorPreferencesSection`, `hooks/use-language-label`
- **`queries`, `domain/code-language`, `types`:** the preferences; the language names; `EditorHandle`, the `ref` with `focus()` only
- It cannot import `ai`: Explain Code and prompt optimization reach the editors through slots that `items` fills
- **Uses:** `auth`

### ai

- **Owns:** no model; the prompts, the parsing, the access check with its limits and the OpenAI operations: tags, summary, Explain Code, prompt optimization; how an AI output is marked ([ADR 0027](adr/0027-marking-ai-generated-output.md)). It takes the content as input, reads no item and writes nothing. The vendor client is `lib/vendors/openai.ts`
- **`services/`:** `explain` and `prompt-optimizer` over `text-stream`: every refusal and failure before the first words is a status, so a route can still answer with one; a refusal over a limit says when to try again
- **`components/`:** `AiTagSuggestions`, `AiDescriptionSummary`, `AiCodeExplanation`, `AiPromptOptimizer`, each a render prop that knows nothing of the form or editor around it; `AiGeneratedLabel`
- **`domain/marking`, `schemas`:** `aiMarkProps`, the one spelling of the mark; the inputs of the routes
- **Uses:** `auth`, `billing`, `editor`

### search

- **Owns:** no model; the Cmd+K palette and its search. The ranking runs in the owners' private queries ([ADR 0018](adr/0018-search-in-postgres.md))
- **`services/search`, `schemas`:** the limit per user, the owners' results and the lock of each, for `app/api/search`
- **`components/CommandPalette`:** the top bar's button; the rest is loaded on demand
- **`domain/item-page`:** `itemPagePath`; `isItemPage`, since an item's own page gets no drawer over it
- **Uses:** `auth`, `billing`, `item-types`, `ai`, `items`, `collections`

### import-export

- **Owns:** no model; the export format and the export ([ADR 0019](adr/0019-export-without-file-bytes.md)), the import in batches ([ADR 0020](adr/0020-import-as-batched-data-input.md)), the data section of the settings page. It writes through the owners' services, never straight to Prisma
- **`services/export`:** Pro, once a minute, then the stream, for `app/api/export`
- **`components/DataSection`:** composed by the settings page, which passes the plan
- **Uses:** `auth`, `billing`, `item-types`, `items`, `collections`

### account

- **Owns:** no model; the delete-account flow: the proof, stop the billing, purge the files, delete the rows, purge once more ([ADR 0004](adr/0004-direct-upload-to-r2.md)). A failed step ends it before the rows. The same removal runs daily for registrations never verified
- **`services/retention`:** the daily job, for the cron route
- **`components/`:** `DeleteAccountDialog` (the settings page), `ConfirmAccountDeletion` (the page of the emailed link)
- **Uses:** `auth`, `billing`, `files`

### app-shell

- **Owns:** nothing in the database; the frame of every signed-in page: shell, top bar, sidebar, skip link, the create menu of a phone, the language switch ([ADR 0024](adr/0024-locale-decision.md))
- **`components/`:** `DashboardShell` (takes the sidebar and the buttons that need the plan as slots, so it waits for no read), `CreateMenu`, `Sidebar`, `SidebarSkeleton`
- **`domain/sidebar`, `schemas`:** the cookie of the open sidebar; the locale body of `POST /api/locale`
- **Uses:** `auth`, `billing`, `item-types`, `items`, `collections`, `search`

## Planned modules

Each one is created in the commit with its first code. "Expects to use" is what the rank order allows and the specs need.

None at the moment.

## Not modules

- **`tags`:** stays in `items` until a second feature needs a tag vocabulary. Tag suggestions from `ai` are free text and need none
- **Observability:** no module owns it: it has no model, no rank and no screen of its own. The vendor client and the logger are in `lib/` (`sentry.ts`, `sentry-server.ts`, `sentry-scrub.ts`, `error-summary.ts`, `logger.ts`), `src/instrumentation.ts` and `src/instrumentation-client.ts` start the SDK, and the error pages report through `useReportError` in `components/common/hooks/`. See [ADR 0016](adr/0016-error-monitoring-with-sentry.md)
- **`marketing`:** the homepage is one page in two languages, `/` (`(en)/page.tsx`) and `/de` (`de/page.tsx`), both static and both rendering `HomeContent`, so it lives in `app/(marketing)/` with its own `_components/` ([ADR 0024](adr/0024-locale-decision.md)). Its pricing table comes from `billing` (the numbers from `domain/limits`, the cards from `components/`, shared with `/upgrade`), and its header learns of the session through `useHasSession` from `auth`. `MarketingFrame` carries the header and footer, with the client messages of the page; the `(en)` layout uses it for `/` and the legal pages, the `de` layout for `/de`. The legal pages (`/impressum`, `/datenschutz`, `/agb`) are static routes of the same group; the Impressum and the privacy notice are data in `_legal/` (the vendor list in `vendors.ts`), rendered by `LegalPage` and `LegalDocument` in `_components/`. The provider's facts (`operator.ts`) and the contract texts (the AGB and the withdrawal information, plain strings with `{values}` filled from `billing/domain/limits`, versioned by `TERMS_VERSION`) live in `lib/legal/`, because the § 312f confirmation email of `billing` carries them in full (ADR 0032); `contract-content.tsx` in `_components/legal/` renders them for `/agb`; the paths are in `lib/http/legal-paths.ts`, which the footer, `AuthCard` of `auth` and the user menu of `app-shell` link to. The pricing section receives `TestModeHint` of `billing` as a slot from the page. See [ADR 0014](adr/0014-launch-mode.md)
- **Favorites, pinned, pagination, settings, dashboard:** pages that compose modules. `/settings` holds the account section (`AccountActions` in its `_components/`) and the billing panel (`BillingPanel`, which reads the plan, the counts and the Stripe mode, `isStripeTestMode` of `lib/vendors/stripe`, for `BillingSection` of `billing`, and passes in `LockedFilesRow` of `items`). `/settings/locked-files` composes `LockedFileList` of `items`; `/upgrade` composes `ProUpgradePanel` of `billing` with the same row, and redirects a Pro user to `/settings`. The top bar's `UpgradeButton` is in `app/(app)/_components/` and streams in like `NewItemButton`, composes `EditorPreferencesSection` of `editor`, and `DataPanel`, which reads the plan for `DataSection` of `import-export`; `/favorites` composes queries of `items` and `collections`: the collections first, sorted in the browser through `domain/favorite-sort` of `collections`, then the items as an endless list read in its sort on the server (newest, oldest, A-Z, Z-A, by type) through `FavoriteLists`, `useFavoritePages` and `LoadMore`. `/pinned` composes `getPinnedFirstPages`: one accordion per type through `PinnedLists`, one sort for all, each group with its own pages, Show more and open state. Both keep their scroll place on Back through `useScrollRestore`. Both pages share `ListRow`, `ListRowFrame` (the row with its controls beside the trigger), `ListPagesFrame` (the rows of an endless list, dimmed while a sort loads) and `SortSelect` in `app/(app)/_components/`, with `hooks/use-row-focus`, which moves the focus when a row removes itself, although `items` owns the rows of items: `ListRow` takes slots, knows no item and renders collections too

## Applying the rules to what exists

The rule "a new file starts in `_internal/`" applies to new files. Files that are already public stay where they are, even where nothing outside the module imports them today (`ItemCard` in `items`). Move one only when you touch it for another reason.
