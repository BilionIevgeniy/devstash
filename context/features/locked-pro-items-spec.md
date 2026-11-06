# Locked Pro Items

The second half of Free plan gating. The first half closed the file and image pages to a Free user; a user who keeps files from a cancelled subscription can still open them from the dashboard, collections and search, and `/api/items/[id]` still answers. This feature closes that gap. It needs its own branch and its own plan review before any code.

## Goals

- File and image items of a Free user are locked wherever they show (dashboard, collections, favorites, pinned, search, sidebar): dimmed, with "Renew your subscription to open" over the middle of a card, and they do not open
- A "Locked files" section on `/settings`: a paginated list with title, file name, size, Download and Delete, and no preview, drawer or editing. It is the one place a Free user can reach these files, so they are not held hostage to a payment and can free the item limit. Locked cards link to it
- The server refuses what the UI hides: no signed URLs reach a Free user anywhere but this list

## Decisions from the architecture review

### Server

- A service such as `openUserItem(userId, id)` returns `ok`, `locked` or `missing`. It decides from the record's real type before signing, and `/api/items/[id]` (403 when locked) and the `@drawer` route map the result. `params.type` of the drawer route is the page behind the drawer, so the slug cannot be used there. A gate inside `getUserItemDetail` would break `updateUserItem`
- `getUserCollectionListing` reads `getEntitlements` itself and signs no URLs for a Free user. `ImageCard` falls back when `imageUrl` is `null` and `FileRow` drops Download when `file` is `null`; a locked row loses its file name and size
- `updateUserItem` refuses a Pro type for a Free user: it ends with `getUserItemDetail`, so the action returns signed URLs. `getItemEditState` already gives `typeName`
- Favorite and pin are hidden in the UI only: they expose no file

### UI

- Two shapes in `_internal/components/LockedItem*`. A card has the dimmed content, a sibling overlay link and a corner delete. A row has the dimmed content, one link and delete in the actions column
- Opacity goes on the content wrapper only, or the delete button dims too
- `ItemDrawerTrigger` branches to these and renders no `role="button"`, `tabIndex` or `open`: a link or a button inside `role="button"` is not allowed. `ItemRowActions`, `ItemCardTrigger`, `ImageGallery` and `FileRow` become lock-aware for their own controls, because on `/favorites`, `/pinned` and in `FileRow` those controls are siblings of the trigger
- Locked rows keep an `<a>`: `useRowFocus` looks for `[role="button"], a`
- Delete uses the waiting form of `ItemDeleteHandler`, as `ItemDetailPage` does: await `deleteItem` with no `hideItem`, return `false` on failure so the dialog stays open, and let the action's refresh remove the row. An optimistic hide would unmount the dialog that called it. Focus goes to the provider's sentinel, which needs a close-focus prop on `DeleteItemDialog`, plus a `className` for use over images and an accessible label with the title
- `SidebarItemLink` and search rows are dimmed too, and go to `/settings` with the same param
- The disabled rows of `TypesSection` use `aria-disabled` on a `div` with no role, which says little to a screen reader: improve it here

### Wiring `isPro`

- `isPro` on `ItemDrawerProvider` is optional and off by default, for the dashboard, favorites, pinned and collection pages. The `items/[type]` layout does not need it: the page already refuses a Free user
- `DashboardPage` turns async and gets `dashboard/loading.tsx` with the header and the four existing skeletons
- Search: `getSearchIndex` reads `getEntitlements` and adds the lock to the index, which is read again on every open. `PaletteResults` branches on the indexed value and its provider stays as it is. Threading `isPro` through the shell would make it wait and go stale

### Tests

Service tests with `@/lib/prisma` and billing mocked: a locked read signs nothing, the update refuses a Pro type, a collection listing gives a Free user no URLs and a Pro user URLs, delete still works for a Free user. Update `route.test.ts`, which mocks `getUserItemDetail`, and add the 403 case.

### Fixture

The seed leaves the demo user with no file items, and a Free user cannot create them. Testing needs a fixture on `development`: give a test user a `Subscription` row, upload a file and an image, remove the row.

## Accepted trade-offs

- URLs signed before a cancellation stay valid for up to 2 hours
- A tab left open across a cancellation shows unlocked cards, and a click fails with the drawer's error state
- A Free user keeps download access with no expiry, and the objects stay in R2. A retention policy waits for real numbers
- ZIP export is planned as Pro, so it does not replace this list: revisit when `import-export` is built
