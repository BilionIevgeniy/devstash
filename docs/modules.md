# Modules

The catalogue of DevStash's modules: what each one owns, what it uses and what the rest of the code may import from it. It does not repeat the ranks. The numbers live in `FEATURE_RANKS` in `eslint.config.mjs` and in the table "Ranks" in [context/architecture-rules.md](../context/architecture-rules.md), and a module may use any module of a lower rank. The rules for adding a module are in [architecture.md](architecture.md).

A module gets its section here in the commit with its first real code, together with its `FEATURE_RANKS` row. The sections of planned modules are written from the specs and are not built. A test that compares this list with `FEATURE_RANKS` is planned, for existing modules only.

## Who owns which model

| Model | Owner | Note |
| ----- | ----- | ---- |
| User, Account, Session, VerificationToken | `auth` | The Stripe columns on `User` move to `billing` (see below) |
| ItemType | `item-types` | |
| Item, Tag, ItemTag | `items` | `Tag` becomes its own module only when a second feature needs it |
| Collection, ItemCollection | `collections` | |
| Subscription, StripeEvent | `billing` (planned) | `isPro` is derived from the subscription status; nothing reads the old `User` columns yet |
| UserPreference | `editor` (planned) | One row per user, typed columns, an absent row means defaults, created by upsert |

A module writes only the models it owns and reads only its own models. A relation `select` of scalar columns through its own relation is fine (`items` selects the type name, icon and color through `Item.type`, and the id and name of each collection through `Item.collections`). Everything else goes through the owner's queries or services.

## Existing modules

### auth

- **Owns:** the identity and the session: sign-in, registration, email verification, password reset, change password, delete account (until `account` exists)
- **Uses today:** `lib` only
- **Entry points used from outside:**
  - `nextauth/session` (`getSessionUser`), `nextauth/auth` (route handlers, `signIn`, `signOut`), `nextauth/auth.config` (used by `proxy.ts`)
  - `actions/sign-in`, `queries`, `schemas`, `services/registration`, `services/account`, and the `domain/` files for tokens, rate limits and reset links, all called by pages and routes
  - `components/`: `AuthCard`, the forms (`SignInForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `ConfirmEmailForm`, `ChangePasswordForm`), `ResendVerificationButton`, `GitHubSignInButton`, `DeleteAccountDialog`, `UserAvatar`
- **Private:** the actions of its own forms, emails, token and password helpers, error classes, messages, the GitHub grant service

### item-types

- **Owns:** `ItemType`, the system types and, later, the custom types of Pro users
- **Uses today:** nothing
- **Entry points used from outside:** `components/TypeIcon`; `domain/item-type` (`typeSlug`, `parseTypeSlug`, the mapping from row to `ItemTypeInfo`); `queries` (`itemTypeSelect`, `getItemTypeByName`, `getSidebarItemTypes`); `types`

### items

- **Owns:** `Item`, `Tag`, `ItemTag`; the list, cards and rows of items; the item drawer (the detail view, fetched from `app/api/items/[id]`); the item queries
- **Uses today:** `item-types`
- **Entry points used from outside:** `components/ItemList`, `components/ItemRow`, `components/ItemDrawerProvider` (wraps a page), `components/ItemDrawerTrigger` (wraps a card); `queries` (`getPinnedItems`, `getRecentItems`, `getItemsByType`, `getItemDetail`, `getItemStats`); `schemas` (`itemIdSchema`)
- **Private:** the drawer content, its action bar and skeleton
- **Will grow with** (from the specs, not built): create and edit forms, the drawer actions, pin and favorite flags, the file and image views, pagination of items. It will use `item-types`, `files`, `editor`, `ai` and `billing`

### collections

- **Owns:** `Collection`, `ItemCollection`; collection cards and queries
- **Uses today:** `item-types` (types, queries, the type mapping)
- **Entry points used from outside:** `components/CollectionCard`; `queries` (`getRecentCollections`, `getSidebarCollections`, `getCollectionStats`); `types`
- **Known deviation:** `queries.ts` calls `prisma.itemType` directly; it should use a query of `item-types`
- **Will grow with:** the `/collections` and `/collections/[id]` pages, the collection favorite, pagination

### app-shell

- **Owns:** nothing in the database; the frame of every authenticated page: `DashboardShell`, top bar, sidebar
- **Uses today:** `auth` (session, `UserAvatar`, sign-out), `item-types`, `collections`
- **Entry points used from outside:** `components/DashboardShell`, `components/Sidebar`, `components/SidebarSkeleton`
- **Will grow with:** the Cmd+K trigger in the top bar
- **Today:** the PRO label next to the file and image types is a private component of the sidebar's types section; it is not shared

## Planned modules

Each one is created in the commit with its first code. "Expects to use" is what the rank order allows and the specs need.

### billing

- **Owns:** `Subscription`, `StripeEvent`; the entitlements (limits, Pro) as `domain/limits.ts` plus `queries.ts` `getEntitlements`, read through `cache()` and never from the JWT or the session; checkout, portal and the webhook service; the billing section of the settings page
- **Expects to use:** `auth`
- **Entry points:** `queries.getEntitlements`, `domain/limits` (pure, also used by the homepage pricing), `components/BillingSection`; the thin route `app/api/webhooks/stripe/route.ts`
- **Pro badge:** the sidebar's PRO label stays private to `app-shell`; it moves into `billing` only when a second place needs it
- **First code:** its first migration moves `isPro`, `stripeCustomerId` and `stripeSubscriptionId` out of `User` into `Subscription`. Specs: the two Stripe phases

### files

- **Owns:** no model; the file rules, the key scheme (`users/<userId>/`), presigned upload and download, deleting objects; `lib/r2.ts` is the vendor client
- **Expects to use:** `auth`, `billing`
- **Entry points:** the upload action, `components/FileUpload`
- **First code:** the file and image upload spec. The browser sends the file straight to R2; deletes remove the object first, then the row ([ADR 0004](adr/0004-direct-upload-to-r2.md)). A `FileDeletion` outbox is the upgrade path, not built

### editor

- **Owns:** `UserPreference`; `CodeEditor` (Monaco), `MarkdownEditor`, `MarkdownPreview`; the preferences provider, form and action
- **Expects to use:** `auth`
- **Entry points:** the editor components, `EditorPreferencesProvider` (mounted in `app/(app)/layout.tsx`, fed by a cached read), `EditorPreferencesSection`
- **First code:** the code editor spec. It cannot import `ai`: the Explain button reaches the editor header through a slot that `items` fills

### ai

- **Owns:** no model; the prompts, output parsing, quota and the OpenAI operations (`lib/openai.ts` is the vendor client)
- **Expects to use:** `auth`, `billing` (Pro gate), `editor` (`MarkdownPreview`)
- **Entry points:** `ExplainButton`, `SuggestTagsButton`, the actions. It takes the content as input and never reads items
- **First code:** auto-tagging or Explain Code. Streaming goes through `app/api/ai/<operation>/route.ts`, calling the same service

### search

- **Owns:** no model; the Cmd+K palette and its index
- **Expects to use:** `items`, `collections`, `item-types` (through their queries)
- **Entry points:** `components/CommandPalette`, mounted by `app-shell`

### import-export

- **Owns:** no model; the export format (versioned, pure), the import and export services, the data section of the settings page
- **Expects to use:** `items`, `collections`, `files`, `billing` (ZIP is Pro). Imports write through the owners' services, never straight to Prisma
- **Entry points:** `components/DataSection`; the thin route `app/api/export/route.ts` only sets headers

### account

- **Owns:** no model; the delete-account flow: cancel the Stripe subscription, purge the files, then delete the rows
- **Expects to use:** `auth`, `billing`, `files`
- **First code:** the change that adds the first higher dependency. `deleteUserAccount` and `DeleteAccountDialog` move here from `auth`

## Not modules

- **`tags`:** stays in `items` until a second feature needs a tag vocabulary. Tag suggestions from `ai` are free text and need none
- **`marketing`:** the homepage is one route, so it lives in `app/(marketing)/` with its own `_components/`. Its pricing numbers come from `billing/domain`
- **Favorites, pagination, settings, dashboard:** pages that compose modules. `/settings` composes the `*Section` components of `billing`, `editor` and `import-export`; `/favorites` composes queries of `items` and `collections`

## Applying the rules to what exists

The rule "a new file starts in `_internal/`" applies to new files. Files that are already public stay where they are, even where nothing outside the module imports them today (`ItemCard` in `items`). Move one only when you touch it for another reason.
