# Modules

The catalogue of DevStash's modules: what each one owns, what it uses and what the rest of the code may import from it. It does not repeat the ranks. The numbers live in `FEATURE_RANKS` in `eslint.config.mjs` and in the table "Ranks" in [context/architecture-rules.md](../context/architecture-rules.md), and a module may use any module of a lower rank. The rules for adding a module are in [architecture.md](architecture.md).

A module gets its section here in the commit with its first real code, together with its `FEATURE_RANKS` row. The sections of planned modules are written from the specs and are not built. A test that compares this list with `FEATURE_RANKS` is planned, for existing modules only.

## Who owns which model

| Model | Owner | Note |
| ----- | ----- | ---- |
| User, Account, Session, VerificationToken | `auth` | |
| ItemType | `item-types` | |
| Item, Tag, ItemTag | `items` | `Tag` becomes its own module only when a second feature needs it |
| Collection, ItemCollection | `collections` | |
| Subscription | `billing` | `isPro` is derived from the subscription status; no row means the Free plan |
| StripeEvent | `billing` (planned) | The webhook's idempotency record, with the Stripe specs |
| UserPreference | `editor` (model planned) | One row per user, typed columns, an absent row means defaults, created by upsert |

A module writes only the models it owns and reads only its own models. A relation `select` of scalar columns through its own relation is fine (`items` selects the type name, icon and color through `Item.type`, and the id and name of each collection through `Item.collections`). Everything else goes through the owner's queries or services.

## Existing modules

### auth

- **Owns:** the identity and the session: sign-in, registration, email verification, password reset, change password; for deleting an account, the proof check and the deletion of its rows (the flow itself is `account`'s)
- **Uses today:** `lib` only
- **Entry points used from outside:**
  - `nextauth/session` (`getSessionUser`), `nextauth/auth` (route handlers, `signIn`, `signOut`), `nextauth/auth.config` (used by `proxy.ts`)
  - `actions/sign-in`, `queries`, `schemas`, `services/registration`, `services/account`, and the `domain/` files for tokens, rate limits and reset links, all called by pages and routes
  - `services/account` for `account` only: `verifyAccountDeletion` returns a `VerifiedDeletion` that only it can build, and `deleteVerifiedUserRows` takes nothing else, so the rows cannot be deleted without the proof check
  - `components/`: `AuthCard`, the forms (`SignInForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `ConfirmEmailForm`, `ChangePasswordForm`), `ResendVerificationButton`, `GitHubSignInButton`, `UserAvatar`
- **Private:** the actions of its own forms, emails, token and password helpers, error classes, messages, the GitHub grant service

### billing

- **Owns:** `Subscription` (later `StripeEvent`); the entitlements (limits, Pro) as `domain/limits.ts` plus `queries.ts` `getEntitlements`, read through `cache()` and never from the JWT or the session; later checkout, portal and the webhook service, and the billing section of the settings page
- **Uses today:** nothing
- **Entry points used from outside:** `queries` (`getEntitlements`), `domain/limits` (`entitlementsFor`, `Entitlements`), `components/ProBadge` (the sidebar's file and image types, the same types in the create dialog)
- **Today:** created by the file upload spec for the Pro check. Its first migration created `Subscription`; the old `isPro`, `stripeCustomerId` and `stripeSubscriptionId` on `User` stay, read by nothing, until the contract migration in `context/todo.md` drops them. Nobody can become Pro in production until the Stripe specs; in development the seed gives the demo user an active subscription
- **Will grow with** (from the two Stripe specs, not built): `StripeEvent`, checkout, portal, the webhook service behind the thin route `app/api/webhooks/stripe/route.ts`, `components/BillingSection`, the Free limits in `domain/limits` (also used by the homepage pricing). It will use `auth`

### item-types

- **Owns:** `ItemType`, the system types and, later, the custom types of Pro users
- **Uses today:** nothing
- **Entry points used from outside:** `components/TypeIcon`; `domain/item-type` (`typeSlug`, `parseTypeSlug`, the mapping from row to `ItemTypeInfo`); `queries` (`itemTypeSelect`, `getItemTypeByName`, `getSidebarItemTypes`); `types`

### files

- **Owns:** no model; the objects in R2 under `users/<userId>/`: the file rules (kinds, sizes, the extension → Content-Type map, the extension → icon kind; the browser's `File.type` is never used), the key scheme, presigned upload, the confirm step after the PUT, signed download URLs, deleting and purging objects; `lib/r2.ts` is the vendor client ([ADR 0004](adr/0004-direct-upload-to-r2.md))
- **Uses today:** `billing` (`getEntitlements` in the presign service), `auth` (`getSessionUser` in the action, `getTooManyAttemptsMessage` from `domain/rate-limits` for the presign limit)
- **Entry points used from outside:** `components/FileUpload` (drop zone, the browser's PUT with progress, aborted on unmount); `components/FileTypeIcon` (the icon of a file by its extension: PDF, text, code, spreadsheet or plain); `services/objects` (`confirmUpload`, `deleteUserObject`, `purgeUserObjects`, `signFileUrls`); `domain/file-rules` (`FileKind`, `formatFileSize`, `fileIconKind`); `types` (`UploadedFile`, `FileUrls`)
- **Inside the feature only, so far:** `actions/upload` (`requestUpload`), `services/presign-upload`, `schemas`
- **Download URLs:** signed at the start of a one-hour window and valid for two, so they repeat across renders (the browser caches images) and stay valid for at least an hour after any render. The caller checks that the key belongs to the user before it asks for them
- **Upgrade path, not built:** a `FileDeletion` outbox processed by a cron route, if deletions start to fail in practice

### items

- **Owns:** `Item`, `Tag`, `ItemTag`; the list, cards and rows of items; the create dialog; the item drawer (the detail view, editing it in place, deleting it): on the dashboard it is fetched from `app/api/items/[id]`, on a type page it is the intercepted route `/items/[type]/[id]` read on the server; the full item page the same URL shows on a reload; the item queries, the item create, update and delete
- **Uses today:** `item-types` (types, `itemTypeSelect`, `getItemTypeByName` in the create service), `auth` (`getSessionUser` in the actions), `editor` (`CodeEditor` for the content of snippets and commands, `MarkdownEditor` for the content of notes and prompts, in the create dialog, the edit form and the drawer), `files` (`FileUpload` in the create dialog; `confirmUpload` in the create, `deleteUserObject` in the delete, `signFileUrls` in the item detail, gallery and file list services, through `_internal/services/file-urls`; `formatFileSize` in the drawer and the file rows; `FileTypeIcon` in the file rows), `billing` (`getEntitlements` in the create service, `ProBadge` in the create dialog)
- **Entry points used from outside:** `components/ItemList`, `components/ImageGallery` (the thumbnails of an image type page, 16:9 and cropped, a 5% zoom on hover; the cards open the drawer like `ItemList`), `components/ImageGallerySkeleton` (its skeleton, for the client `loading.tsx` of `items/[type]`, which picks it by the type in the URL), `components/FileList` (the rows of a file type page: icon by extension, title over the file name, size, upload date, a Download link beside the row's drawer trigger; the details stack on mobile), `components/FileListSkeleton` (its skeleton, picked the same way), `components/ItemRow`, `components/ItemCardTrigger` (the drawer trigger of a card or dashboard row, with the copy button over its corner when the item has text or a URL to copy; the card carries only `canCopy`, and the button reads the text from `app/api/items/[id]` on click), `components/ItemDrawerProvider` (wraps the dashboard page; with `basePath`, wraps the `items/[type]` layout, where opening a card navigates to the item URL), `components/ItemDrawerTrigger` (wraps a card, or with `className` the clickable part of a file row; `action` puts a control beside the trigger, over its corner), `components/ItemRouteDrawer` (the sheet, content, skeleton and missing state of the intercepted item route), `components/ItemDetailPage` (the full item page, and `ItemDetailPageSkeleton` for its `loading.tsx`), `components/CreateItemDialog` (the top bar's New Item button through `app/(app)/_components/NewItemButton`, and the New &lt;Type&gt; button of a type page through `defaultType`; both pass `isPro`, and a Free user sees File and Image disabled with a PRO badge); `domain/item-fields` (`isCreatableType`, which decides whether a type page shows that button; `typeListing`, which decides whether it shows the gallery, the file list or the cards; `requiresPro`, also used by the sidebar); `domain/item-detail` (`toItemDetailJson`, the detail with ISO dates the client components take); `services/item-detail` (`getUserItemDetail`, `getUserItemDetailOfType`: the detail with the upload as signed URLs, for `app/api/items/[id]` and the item routes); `services/gallery` (`getUserGalleryItems`: the items of an image type with a signed thumbnail URL, the drawer's view URL, so opening a card reuses the cached image); `services/file-list` (`getUserFileListItems`: the items of a file type with the upload's name, size and signed URLs); `queries` (`getPinnedItems`, `getRecentItems`, `getItemsByType`, `getItemStats`); `schemas` (`itemIdSchema`)
- **Inside the feature only, so far:** `actions/item` (`createItem`, `updateItem`, `deleteItem`), `services/item` (`createUserItem`, `updateUserItem`, `deleteUserItem`), `queries` (`getItemDetail`, `getItemDetailOfType`: the `ItemDetailRecord` with the object key, read only by the item detail service; `getUploadItemsByType`: the `UploadItemRecord` with the object key, name and size, read only by the gallery and file list services), `schemas` (`createItemSchema`, `updateItemSchema`, `deleteItemOptionsSchema`), `domain/item-fields` (the editable fields per type, including which use the code editor and which store an upload, the creatable types, the content type of a new item, the tag input parser), `domain/item-changes` (whether the edit form differs from the saved item, so an unchanged form is not saved)
- **Files and images:** the item stores the R2 key (`fileKey`, unique), the name and the size R2 reported; the key never leaves the server. The upload is set on create and not edited afterwards. Deleting the item deletes the object first ([ADR 0004](adr/0004-direct-upload-to-r2.md))
- **Private:** `_internal/services/file-urls` (`signItemFile`, the one place an item's upload is signed: the file name is part of the signature, so the gallery, the file list and the drawer derive it the same way); `ImageCard` (a client component: a thumbnail that fails to load, an expired URL, falls back to the type icon); `FileRow` (a client component: it hides the whole row, Download included, while a delete from the drawer is in flight); the drawer content (with the file view: an image preview in a fixed-height frame, the file row with Download), its action bar, edit form, delete dialog and skeleton; `ItemDetailView`, the edit state shared by the route drawer and the full item page; the `Field` wrapper shared by the create and edit forms; `ItemCopyButton` (the cards' copy button) and `fetch-item-detail` (the browser side of `app/api/items/[id]`, shared with the drawer); `DiscardChangesDialog`, asked before unsaved edits are thrown away (the edit form's Cancel, and closing the dashboard drawer or the route drawer, which learn of the edits through `onDirtyChange`)
- **Will grow with** (from the specs, not built): the other drawer actions (favorite, pin, copy), pin and favorite flags, pagination of items. It will use `ai`

### collections

- **Owns:** `Collection`, `ItemCollection`; collection cards and queries
- **Uses today:** `item-types` (types, queries, the type mapping)
- **Entry points used from outside:** `components/CollectionCard`; `queries` (`getRecentCollections`, `getSidebarCollections`, `getCollectionStats`); `types`
- **Known deviation:** `queries.ts` calls `prisma.itemType` directly; it should use a query of `item-types`
- **Will grow with:** the `/collections` and `/collections/[id]` pages, the collection favorite, pagination

### editor

- **Owns:** the editors of item content: `CodeEditor` (Monaco, loaded from the jsDelivr CDN by `@monaco-editor/react`) with its dark theme, header (window dots, language, copy) and fluid height up to 400px; the mapping from the free-text language field to the editor's language id; `MarkdownEditor` (Write and Preview tabs on Radix `Tabs`, the Write panel kept mounted so the textarea keeps its undo history; readonly shows only the preview) with the same frame, header and 400px height; the Markdown preview (`react-markdown` with `remark-gfm` and `remark-breaks`, no raw HTML, links open in a new tab, styled by `.markdown-preview` in `globals.css`), loaded with `next/dynamic` so the parser is fetched only when a preview first renders
- **Uses today:** nothing
- **Entry points used from outside:** `components/CodeEditor`, `components/MarkdownEditor` (both used by `items`)
- **Private:** `_internal/domain/code-language` (`editorLanguage`); `_internal/components/EditorHeader` (window dots, a slot for the language label or the tabs, the copy button), shared by both editors; `_internal/components/MarkdownPreview` (moves to `components/` when `ai` needs it)
- **Will grow with** (from the specs, not built): `UserPreference` and the preferences provider, form and action (`EditorPreferencesProvider` mounted in `app/(app)/layout.tsx`, `EditorPreferencesSection`). It will use `auth`. It cannot import `ai`: the Explain button reaches the editor header through a slot that `items` fills

### account

- **Owns:** no model; the delete-account flow: verify the proof (`auth`), purge the user's files (`files`) and abort if that fails, delete the rows (`auth`), then purge once more as best effort for an upload from another tab that landed in between ([ADR 0004](adr/0004-direct-upload-to-r2.md))
- **Uses today:** `auth` (`verifyAccountDeletion`, `deleteVerifiedUserRows`, `auth`/`signOut` in the action, `reauthenticateWithGitHub` and `REAUTH_REQUIRED_MESSAGE` in the dialog), `files` (`purgeUserObjects`)
- **Entry points used from outside:** `components/DeleteAccountDialog` (the profile page)
- **Private:** `_internal/actions/delete-account` (signs out after a delete, outside its `try`), `_internal/services/delete-account`; `schemas` (`deleteAccountSchema`)
- **Will grow with** (from the Stripe specs, not built): cancelling the Stripe subscription through `billing` before the purge

### app-shell

- **Owns:** nothing in the database; the frame of every authenticated page: `DashboardShell`, top bar, sidebar
- **Uses today:** `auth` (session, `UserAvatar`, sign-out), `item-types`, `items` (`requiresPro` for the sidebar's PRO labels), `billing` (`ProBadge`), `collections`
- **Entry points used from outside:** `domain/sidebar` (`SIDEBAR_COOKIE`, `parseSidebarOpen`: the layout reads the sidebar's open state from a cookie the shell writes); `components/DashboardShell` (closes the mobile drawer on navigation; takes the sidebar and the top bar's New Item button as slots: `app/(app)/layout.tsx` streams the button in under `Suspense`, so the shell does not wait for the plan), `components/Sidebar`, `components/SidebarSkeleton`
- **Will grow with:** the Cmd+K trigger in the top bar

## Planned modules

Each one is created in the commit with its first code. "Expects to use" is what the rank order allows and the specs need.

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

## Not modules

- **`tags`:** stays in `items` until a second feature needs a tag vocabulary. Tag suggestions from `ai` are free text and need none
- **`marketing`:** the homepage is one route, so it lives in `app/(marketing)/` with its own `_components/`. Its pricing numbers come from `billing/domain`
- **Favorites, pagination, settings, dashboard:** pages that compose modules. `/settings` composes the `*Section` components of `billing`, `editor` and `import-export`; `/favorites` composes queries of `items` and `collections`

## Applying the rules to what exists

The rule "a new file starts in `_internal/`" applies to new files. Files that are already public stay where they are, even where nothing outside the module imports them today (`ItemCard` in `items`). Move one only when you touch it for another reason.
