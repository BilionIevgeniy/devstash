# Modules

The catalogue of DevStash's modules: what each one owns, what it uses and what the rest of the code may import from it. It does not repeat the ranks. The numbers live in `FEATURE_RANKS` in `eslint.config.mjs` and in the table "Ranks" in [context/architecture-rules.md](../context/architecture-rules.md), and a module may use any module of a lower rank. The rules for adding a module are in [architecture.md](architecture.md).

A module gets its section here in the commit with its first real code, together with its `FEATURE_RANKS` row. The sections of planned modules are written from the specs and are not built. A test that compares this list with `FEATURE_RANKS` is planned, for existing modules only.

## Who owns which model

| Model | Owner | Note |
| ----- | ----- | ---- |
| User, Account, Session, VerificationToken | `auth` | |
| ItemType | `item-types` | |
| Item, Tag, ItemTag, ItemCollection | `items` | `Tag` becomes its own module only when a second feature needs it; the link to collections is written with the item ([ADR 0008](adr/0008-items-own-the-collection-link.md)) |
| Collection | `collections` | |
| Subscription | `billing` | `isPro` is derived from the subscription status; no row means the Free plan |
| StripeEvent | `billing` (planned) | The webhook's idempotency record, with the Stripe specs |
| UserPreference | `editor` | One row per user, typed columns, an absent row means defaults, created by upsert |

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
- **Private:** the actions of its own forms, emails, token and password helpers, error classes, messages, the GitHub grant service, the reads that return a secret (`_internal/queries`, [ADR 0009](adr/0009-read-write-split-enforced-by-lint.md))

### billing

- **Owns:** `Subscription` (later `StripeEvent`); the entitlements (limits, Pro) as `domain/limits.ts` plus `queries.ts` `getEntitlements`, read through `cache()` and never from the JWT or the session; later checkout, portal and the webhook service, and the billing section of the settings page
- **Uses today:** nothing
- **Entry points used from outside:** `queries` (`getEntitlements`), `domain/limits` (`entitlementsFor`, `Entitlements`), `components/ProBadge` (the sidebar's file and image types, the same types in the create dialog)
- **Today:** created by the file upload spec for the Pro check. Its first migration created `Subscription`; the old `isPro`, `stripeCustomerId` and `stripeSubscriptionId` on `User` stay, read by nothing, until the contract migration in `context/todo.md` drops them. Nobody can become Pro in production until the Stripe specs; in development the seed gives the demo user an active subscription
- **Will grow with** (from the two Stripe specs, not built): `StripeEvent`, checkout, portal, the webhook service behind the thin route `app/api/webhooks/stripe/route.ts`, `components/BillingSection`, the Free limits in `domain/limits` (also used by the homepage pricing). It will use `auth`

### item-types

- **Owns:** `ItemType`, the system types and, later, the custom types of Pro users
- **Uses today:** nothing
- **Entry points used from outside:** `components/TypeIcon`; `domain/item-type` (`typeSlug`, `parseTypeSlug`, the mapping from row to `ItemTypeInfo`); `domain/rank-types-by-usage` (`rankTypesByUsage`, used by `collections` and `items`); `queries` (`itemTypeSelect`, `getItemTypeByName`, `getSidebarItemTypes`); `types`

### files

- **Owns:** no model; the objects in R2 under `users/<userId>/`: the file rules (kinds, sizes, the extension → Content-Type map, the extension → icon kind; the browser's `File.type` is never used), the key scheme, presigned upload, the confirm step after the PUT, signed download URLs, deleting and purging objects; `lib/r2.ts` is the vendor client ([ADR 0004](adr/0004-direct-upload-to-r2.md))
- **Uses today:** `billing` (`getEntitlements` in the presign service), `auth` (`getSessionUser` in the action, `getTooManyAttemptsMessage` from `domain/rate-limits` for the presign limit)
- **Entry points used from outside:** `components/FileUpload` (drop zone, the browser's PUT with progress, aborted on unmount); `components/FileTypeIcon` (the icon of a file by its extension: PDF, text, code, spreadsheet or plain); `services/objects` (`confirmUpload`, `deleteUserObject`, `purgeUserObjects`, `signFileUrls`); `domain/file-rules` (`FileKind`, `formatFileSize`, `fileIconKind`); `types` (`UploadedFile`, `FileUrls`)
- **Inside the feature only, so far:** `actions/upload` (`requestUpload`), `services/presign-upload`, `schemas`
- **Private:** the parts of `FileUpload`: `hooks/use-file-upload` (the upload state, the attempt counter and the abort on unmount), `put-file` (the browser's PUT to R2 with progress, silent on abort), `UploadProgress` (the uploading or finished row) and `DropZone` (the drop area with its hidden file input)
- **Download URLs:** signed at the start of a one-hour window and valid for two, so they repeat across renders (the browser caches images) and stay valid for at least an hour after any render. The caller checks that the key belongs to the user before it asks for them
- **Upgrade path, not built:** a `FileDeletion` outbox processed by a cron route, if deletions start to fail in practice

### items

- **Owns:** `Item`, `Tag`, `ItemTag`, `ItemCollection`; the list, cards and rows of items; the create dialog; the item drawer (the detail view, editing it in place, deleting it): on the dashboard and a collection page it is fetched from `app/api/items/[id]`, on a type page it is the intercepted route `/items/[type]/[id]` read on the server; the full item page the same URL shows on a reload; the item queries, the item create, update and delete
- **Uses today:** `item-types` (types, `itemTypeSelect`, `getItemTypeByName` in the create service), `auth` (`getSessionUser` in the actions), `editor` (`CodeEditor` for the content of snippets and commands, `MarkdownEditor` for the content of notes and prompts, in the create dialog, the edit form and the drawer), `files` (`FileUpload` in the create dialog; `confirmUpload` in the create, `deleteUserObject` in the delete, `signFileUrls` in the item detail, gallery and file list services, through `_internal/services/file-urls`; `formatFileSize` in the drawer and the file rows; `FileTypeIcon` in the file rows), `billing` (`getEntitlements` in the create service, `ProBadge` in the create dialog); at runtime only, `GET /api/collections` for the forms' Collections input ([ADR 0008](adr/0008-items-own-the-collection-link.md))
- **Entry points used from outside:** `components/ItemList`, `components/ImageGallery` (the thumbnails of an image type page, 16:9 and cropped, a 5% zoom on hover; the cards open the drawer like `ItemList`), `components/ImageGallerySkeleton` (its skeleton, for the client `loading.tsx` of `items/[type]`, which picks it by the type in the URL), `components/FileList` (the rows of a file type page: icon by extension, title over the file name, size, upload date, a Download link beside the row's drawer trigger; the details stack on mobile), `components/FileListSkeleton` (its skeleton, picked the same way), `components/ItemRow`, `components/ItemCardTrigger` (the drawer trigger of a card or dashboard row, with the copy button over its corner when the item has text or a URL to copy; the card carries only `canCopy`, and the button reads the text from `app/api/items/[id]` on click), `components/ItemListSkeleton` (the skeleton of the cards, for the `loading.tsx` of `items/[type]` and `collections/[id]`), `components/ItemDrawerProvider` (wraps the dashboard page and the collection page; with `basePath`, wraps the `items/[type]` layout, where opening a card navigates to the item URL; the command palette has its own, with `onSheetCloseAutoFocus` to take the focus back), `components/ItemDrawerTrigger` (wraps a card, or with `className` the clickable part of a file row; `action` puts a control beside the trigger, over its corner), `components/ItemRouteDrawer` (the sheet, content, skeleton and missing state of the intercepted item route), `components/ItemDetailPage` (the full item page, and `ItemDetailPageSkeleton` for its `loading.tsx`), `components/CreateItemDialog` (the top bar's New Item button through `app/(app)/_components/NewItemButton`, and the New &lt;Type&gt; button of a type page through `defaultType`; both pass `isPro`, and a Free user sees File and Image disabled with a PRO badge); `domain/item-fields` (`isCreatableType`, which decides whether a type page shows that button; `typeListing`, which decides whether it shows the gallery, the file list or the cards; `requiresPro`, also used by the sidebar); `domain/item-detail` (`toItemDetailJson`, the detail with ISO dates the client components take); `services/item-detail` (`getUserItemDetail`, `getUserItemDetailOfType`: the detail with the upload as signed URLs, for `app/api/items/[id]` and the item routes); `services/gallery` (`getUserGalleryItems`: one page of the items of an image type with a signed thumbnail URL, the drawer's view URL, so opening a card reuses the cached image); `services/file-list` (`getUserFileListItems`: one page of the items of a file type with the upload's name, size and signed URLs); `services/collection-listing` (`getUserCollectionListing`: one page of a collection in one section per type, the type with the most items in the whole collection first, each listed as `typeListing` says: the sections of a collection page); `queries` (`getPinnedItems`, `getRecentItems`, `getItemsByType`: one page, `getItemStats`, `getSearchableItems`: the newest 1000 with a short preview, never the content, for the search index); `schemas` (`itemIdSchema`)
- **Inside the feature only, so far:** `actions/item` (`createItem`, `updateItem`, `deleteItem`), `services/item` (`createUserItem`, `updateUserItem`, `deleteUserItem`), `domain/pagination` (`ITEMS_PER_PAGE`), `domain/group-by-type` (`groupItemsByType`), `schemas` (`createItemSchema`, `updateItemSchema`, `deleteItemOptionsSchema`), `domain/item-fields` (the editable fields per type, including which use the code editor and which store an upload, the creatable types, the content type of a new item, the tag input parser), `domain/item-changes` (whether the edit form differs from the saved item, so an unchanged form is not saved; `typeFieldValues`, the type-specific fields both forms send), `domain/item-collections` (the choices of the Collections input and the text on its trigger)
- **Files and images:** the item stores the R2 key (`fileKey`, unique), the name and the size R2 reported; the key never leaves the server. The upload is set on create and not edited afterwards. Deleting the item deletes the object first ([ADR 0004](adr/0004-direct-upload-to-r2.md))
- **Private:** `_internal/queries` (every read that returns the object key, [ADR 0010](adr/0010-pagination-in-lib-and-object-key-reads-in-internal.md): `getItemDetail`, `getItemDetailOfType`, read by the item detail service; `getItemFileKey`, by the delete; `getUploadItemsByType`, one page of `UploadItemRecord`, by the gallery and file list services; `getCollectionItemRecords`, the same rows with `canCopy`, and `getCollectionTypeCounts`, the totals per type, by the collection listing service; and the selects and mappers `queries` shares with them); `_internal/services/file-urls` (`signItemFile`, the one place an item's upload is signed: the file name is part of the signature, so the gallery, the file list and the drawer derive it the same way); `ImageCard` (a client component: a thumbnail that fails to load, an expired URL, falls back to the type icon); `FileRow` (a client component: it hides the whole row, Download included, while a delete from the drawer is in flight); the drawer content and its parts (`ItemDrawerHeader`; `ItemBody` with the file view: an image preview in a fixed-height frame, the file row with Download; `ItemMeta`; `DrawerSection`), its action bar, edit form, delete dialog and skeleton; `ItemFields` (the text fields shared by the create and edit forms), `ItemTypeSelect` (the create dialog's type list with Pro badges) and `CollectionSelect` (the Collections input of both forms, with `hooks/use-collection-options` and `fetch-collection-options`, the browser side of `GET /api/collections`); the hooks in `_internal/components/hooks/`: `use-item-sheet` (the dashboard sheet: its item, detail fetch and edit mode; it owns `ItemDetailState`, which the drawer content takes), `use-dirty-close-guard` (keeps the dashboard drawer and the route drawer open over unsaved edits) and `use-unsaved-changes` (reports the edit form's dirty state and warns before a reload); `ItemDetailView`, the edit state shared by the route drawer and the full item page; `ItemCopyButton` (the cards' copy button) and `fetch-item-detail` (the browser side of `app/api/items/[id]`, shared with the drawer); `DiscardChangesDialog`, asked before unsaved edits are thrown away (the edit form's Cancel, and closing the dashboard drawer or the route drawer, which learn of the edits through `onDirtyChange`)
- **Will grow with** (from the specs, not built): the other drawer actions (favorite, pin, copy), pin and favorite flags. It will use `ai`

### collections

- **Owns:** `Collection`; collection cards with their menu, their skeleton and queries; the create, edit and delete dialogs and the collection create, update and delete. Deleting a collection keeps its items: only their `ItemCollection` rows go, by the cascade. The pages `/collections` and `/collections/[id]` compose these in `app/`, and the second adds the items through `getUserCollectionListing` of `items`
- **Uses today:** `item-types` (types, queries, the type mapping), `auth` (`getSessionUser` in the action)
- **Entry points used from outside:** `components/CollectionCard`; `components/CollectionGridSkeleton` (the dashboard's skeleton and the `loading.tsx` of `/collections`); `components/CreateCollectionDialog` (the top bar's New Collection button; closing waits for a running create); `components/CollectionHeaderActions` (the Favorite, Edit and Delete buttons of a collection page; Favorite is disabled until the feature exists); `queries` (`getRecentCollections`, `getUserCollections`: one page, `getCollectionById`, `getSidebarCollections`, `getCollectionStats`, `getCollectionOptions`, served to the item forms by `app/api/collections`; `getSearchableCollections`, for the search index); `schemas` (`collectionIdSchema`, the id in the URL of a collection page); `types`
- **Inside the feature only, so far:** `actions/collection` (`createCollection`, `updateCollection`, `deleteCollection`), `services/collection` (`createUserCollection`, `updateUserCollection`, `deleteUserCollection`), `schemas` (`createCollectionSchema`, `updateCollectionSchema`, `deleteCollectionOptionsSchema`), `domain/pagination` (`COLLECTIONS_PER_PAGE`), `domain/collection-fields` (the length limits; `hasCollectionChanges`, so an unchanged form is not saved and the collection keeps its place in the lists)
- **Private:** `CollectionFields` (the inputs of the create and edit forms); `EditCollectionDialog` and `DeleteCollectionDialog` (no Radix trigger, shared by the page header and the card menu; `DeleteCollectionDialog` owns the action, the toast and, with `leaveTo`, the way off the deleted page); `CollectionCardMenu` (the 3-dots menu of a card); `hooks/use-collection-dialogs` (the open dialog and the control that gets the focus back)
- **Known deviation:** `queries.ts` calls `prisma.itemType` directly; it should use a query of `item-types`
- **Will grow with:** the collection favorite

### editor

- **Owns:** `UserPreference` and the editor preferences (font size, tab size, word wrap, minimap, theme): the read started by the app layout, saved on every change, one full object per save, so the last write from any tab wins; the editors of item content: `CodeEditor` (Monaco, loaded from the jsDelivr CDN by `@monaco-editor/react`) with its three themes (the `vs-dark` option is Monaco's vs-dark with the app's colors), header (window dots, language, copy) and fluid height up to 400px; the mapping from the free-text language field to the editor's language id; `MarkdownEditor` (Write and Preview tabs on Radix `Tabs`, the Write panel kept mounted so the textarea keeps its undo history; readonly shows only the preview) with the same frame, header and 400px height; the Markdown preview (`react-markdown` with `remark-gfm` and `remark-breaks`, no raw HTML, links open in a new tab, styled by `.markdown-preview` in `globals.css`), loaded with `next/dynamic` so the parser is fetched only when a preview first renders
- **Uses today:** `auth` (`getSessionUser` in the action)
- **Entry points used from outside:** `components/CodeEditor`, `components/MarkdownEditor` (both used by `items`); `components/EditorPreferencesProvider` and `queries` (`getEditorPreferences`; both in `app/(app)/layout.tsx`, around the shell because the top bar's dialogs hold editors); `components/EditorPreferencesSection` (the settings page)
- **Inside the feature only, so far:** `schemas` (`editorPreferencesSchema`); `useEditorPreferences`, exported by the provider, suspends until the read is done, so `CodeEditor` holds a `Suspense`
- **Private:** `_internal/domain/code-language` (`editorLanguage`); `_internal/domain/preferences` (the options, the defaults, `toEditorPreferences`); `_internal/domain/preference-save` (which of several overlapping saves decides the screen and the toast); `_internal/domain/editor-themes` (Monaco theme data); `_internal/actions/preferences` and `_internal/services/preferences`; `_internal/components/MonacoEditor` (the Monaco part of `CodeEditor`, applies the preferences); `_internal/components/EditorHeader` (window dots, a slot for the language label or the tabs, the copy button), shared by both editors; `_internal/components/MarkdownPreview` (moves to `components/` when `ai` needs it)
- It cannot import `ai`: the Explain button reaches the editor header through a slot that `items` fills

### search

- **Owns:** no model; the Cmd+K palette (trigger, hotkey, dialog, results) and its index: `services/search-index` (`getSearchIndex`, composed from the owners' queries, served by `app/api/search`) and the fuzzy search in the browser (Fuse.js, `_internal/components/fuzzy-search`)
- **Uses today:** `items` (`getSearchableItems`, `ItemDrawerProvider` and `useItemDrawer`), `collections` (`getSearchableCollections`), `item-types` (`TypeIcon`, `typeSlug`)
- **Entry points used from outside:** `components/CommandPalette` (the top bar's search button; it holds the open state and the index, and loads the rest with `next/dynamic`); `services/search-index` (`app/api/search`)
- **Inside the feature only, so far:** `domain/item-page` (`isItemPage`: the item's own full page gets no drawer over it), `domain/palette-hotkey` (`isPaletteHotkey`: Cmd/Ctrl+K by the letter typed, by the physical key on a non-Latin layout)
- **Private:** `PaletteDialog` (the lazy part: the dialog and its own `ItemDrawerProvider`, which opens the drawer over any page; it stays mounted while closed so the drawer outlives the palette), `PaletteResults`, `fuzzy-search`, `fetch-search-index`; the hooks `use-search-index` (read on app load and on every open; a new read aborts the one before it) and `use-palette-hotkey` (capture phase, ahead of Monaco's chords; ignored over another modal)

### account

- **Owns:** no model; the delete-account flow: verify the proof (`auth`), purge the user's files (`files`) and abort if that fails, delete the rows (`auth`), then purge once more as best effort for an upload from another tab that landed in between ([ADR 0004](adr/0004-direct-upload-to-r2.md))
- **Uses today:** `auth` (`verifyAccountDeletion`, `deleteVerifiedUserRows`, `auth`/`signOut` in the action, `reauthenticateWithGitHub` and `REAUTH_REQUIRED_MESSAGE` in the dialog), `files` (`purgeUserObjects`)
- **Entry points used from outside:** `components/DeleteAccountDialog` (the settings page)
- **Private:** `_internal/actions/delete-account` (signs out after a delete, outside its `try`), `_internal/services/delete-account`; `schemas` (`deleteAccountSchema`)
- **Will grow with** (from the Stripe specs, not built): cancelling the Stripe subscription through `billing` before the purge

### app-shell

- **Owns:** nothing in the database; the frame of every authenticated page: `DashboardShell`, top bar, sidebar
- **Uses today:** `auth` (session, `UserAvatar`, sign-out), `item-types`, `items` (`requiresPro` for the sidebar's PRO labels), `billing` (`ProBadge`), `collections` (the sidebar's queries, `CreateCollectionDialog` in the top bar), `search` (`CommandPalette` in the top bar)
- **Entry points used from outside:** `domain/sidebar` (`SIDEBAR_COOKIE`, `parseSidebarOpen`: the layout reads the sidebar's open state from a cookie the shell writes); `components/DashboardShell` (closes the mobile drawer on navigation; takes the sidebar and the top bar's New Item button as slots: `app/(app)/layout.tsx` streams the button in under `Suspense`, so the shell does not wait for the plan), `components/Sidebar`, `components/SidebarSkeleton`

## Planned modules

Each one is created in the commit with its first code. "Expects to use" is what the rank order allows and the specs need.

### ai

- **Owns:** no model; the prompts, output parsing, quota and the OpenAI operations (`lib/openai.ts` is the vendor client)
- **Expects to use:** `auth`, `billing` (Pro gate), `editor` (`MarkdownPreview`)
- **Entry points:** `ExplainButton`, `SuggestTagsButton`, the actions. It takes the content as input and never reads items
- **First code:** auto-tagging or Explain Code. Streaming goes through `app/api/ai/<operation>/route.ts`, calling the same service

### import-export

- **Owns:** no model; the export format (versioned, pure), the import and export services, the data section of the settings page
- **Expects to use:** `items`, `collections`, `files`, `billing` (ZIP is Pro). Imports write through the owners' services, never straight to Prisma
- **Entry points:** `components/DataSection`; the thin route `app/api/export/route.ts` only sets headers

## Not modules

- **`tags`:** stays in `items` until a second feature needs a tag vocabulary. Tag suggestions from `ai` are free text and need none
- **`marketing`:** the homepage is one route, so it lives in `app/(marketing)/` with its own `_components/`. Its pricing numbers come from `billing/domain`
- **Favorites, pagination, settings, dashboard:** pages that compose modules. `/settings` holds the account section (`AccountActions` in its `_components/`) and will compose the `*Section` components of `billing`, `editor` and `import-export`; `/favorites` composes queries of `items` and `collections`

## Applying the rules to what exists

The rule "a new file starts in `_internal/`" applies to new files. Files that are already public stay where they are, even where nothing outside the module imports them today (`ItemCard` in `items`). Move one only when you touch it for another reason.
