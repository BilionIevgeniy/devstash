# 0025. TanStack Query for the data the browser fetches, and cursor pages for /favorites and /pinned

- Status: accepted
- Date: 2026-11-14

## Context

`/favorites` and `/pinned` read every favorite and every pin of a user on each visit (`getFavoriteItems`, `getAllPinnedItems`) and sorted them in memory. Two hooks of the item drawer and forms were hand-written fetch state machines with their own loading, error and abort logic and no cache: `use-item-sheet` read the detail again on every open, `use-collection-options` read the options on every form mount.

Cursor pagination fixes the unbounded reads on its own. But an endless list in the browser needs pages, a cursor, loading and error per page, an abort, a reset on a sort change, and a cache outside the component so Back finds the pages again. Written by hand that is a third state machine, bigger than the other two.

## Decision

**TanStack Query (`@tanstack/react-query`, pinned) for the data the browser fetches itself, and only that:** the item detail of the drawer (and of the cards' copy button, which shares it), the options of the forms' Collections input, and the pages of the endless lists. Pages keep reading in Server Components; Server Actions stay the only writes. It is a client library like Radix or cmdk, not a vendor SDK, so the "SDKs only in `lib`" rule does not apply to it.

- **One client per mount of the `(app)` layout** (`components/common/QueryProvider.tsx`, defaults in `components/common/query-client.ts`), never a module singleton: leaving the layout (a sign-out goes to `(auth)`) drops the cache. A refusal of our routes (`RouteError` with a 4xx, `lib/route-error.ts`) is never retried, a failure once; no refetch on window focus; `gcTime` 5 minutes, under the one-hour signed-URL window of an upload. The devtools render only in development
- **Every key starts with `["items"]`** (`items/components/item-queries.ts` `itemKeys`): the detail, the collection options (items fetches them, [ADR 0008](0008-items-own-the-collection-link.md)) and the lists under `["items", "lists", …]`
- **The cache follows each successful action inside the caller's transition, awaited, before it ends** (`syncItemQueries`, bound by `useSyncItemQueries`; `useOptimisticToggle` and `useSubmitDialog` take it as `sync`). An optimistic value ends with its transition, and the action's refresh brings the fresh page by then; a cached row it hid must be gone by then too, or it flashes back. Every branch first cancels the fetches of what it patches (the lists and the detail), so a page already on its way cannot write back the rows it read before the patch; a cancel puts a query back as it was and starts nothing, so the fetches it interrupted that were not a next page (a first page of a new sort, a detail just opened, a refetch another change was waiting for) are started again after the patch (`pauseFetches`). A next page is asked for again by Load more or Show more. While the loaded pages refetch, the list counts as busy: a next page asked for then would join the refetch and fetch nothing. The kinds:
  - a star or a pin patches the row in every cached list and the detail; turned off, the row leaves the lists of that flag; turned on, a list on screen is refetched **and waited for** (Undo, or a star given back in the open drawer: the row must be in its place when the optimistic value ends), a list off screen is only marked stale. This is the one change that waits on the network
  - a delete drops the row from every list and forgets its detail
  - a saved edit writes the detail (keeping the plan read on open), patches the text of the rows and refetches the lists without waiting: a new title settles its A-Z place when that lands. A later patch that cancels this refetch starts it again
  - a new item (and an import) only marks the lists stale; a collection change invalidates the options and the details, not the lists, since no list row carries collections
- **A guard test** (`item-queries.guard.test.ts`) fails when a file imports an action of items, collections or import-export and none of the cache helpers; an exception needs a written reason. A heuristic over imports, not a proof that the sync is awaited in the right place
- **The collection options are read again on each form mount** and show "loading" until that answer comes (`refetchOnMount: "always"`, nothing cached before the mount is shown). The forms sit in the shell's dialogs, which outlive a change of user in another tab of the browser

**Cursor pages:**

- **Value keysets, not Prisma's `cursor: { id }`**: the cursor is the sort values of the last row of a page, then its id, so the next page continues right after it even when that row was unstarred or deleted since. The sort is part of the cursor (`items/domain/list-cursor.ts`), so one made for A-Z sent with Newest is a 400, never a title where the database expects a date. Every sort ends with the id, so the order is total. The comparisons run in Postgres with the collation of the `ORDER BY` (`Item.title` is `und-x-icu`), so a page boundary never skips or repeats a row
- **A favorite always has its date**: the migration `favorited_at_required` adds `CHECK ("isFavorite" = ("favoritedAt" IS NOT NULL))`. Every writer already set both together, so the live deployment was compatible
- **`/favorites` is an endless list** of 30 per page: the first from the page, the next from `GET /api/items/favorites`, fetched by an `IntersectionObserver` sentinel and a Load more button that is always there for the keyboard. The favorite collections, a short list, come first, since nothing below an endless list could be reached
- **`/pinned` is grouped, with a limit per group** (the spec's other option): the first 10 of every type from the page, more from `GET /api/items/pinned` on a Show more button per group, no sentinel. One endless keyset across the groups would make a long or closed group block every group after it. A closed group renders no button, so it never loads. One read per type for the first pages (seven system types); custom types would make it grow (`context/todo.md`)
- **The list key ends with the router's `bfcacheId`** (Next 16: it changes on a push or replace and stays on Back/Forward, `router.refresh()` and a change of the query string). A fresh navigation starts a new entry from the server's page (fresh rows under the fresh count); Back and Forward find every page loaded before; an action's refresh keeps the entry the sync already fixed. The server's first page is `initialData` with `initialDataUpdatedAt` from the time of its read. Old entries go when `gcTime` ends. No clock comparison between server and browser
- **The place on Back**: the app shell scrolls its `<main>`, not the window, so neither the browser nor Next restores it. `useScrollRestore` (`components/common/hooks/`) keeps the scroll position of that `<main>` per path and `bfcacheId` in memory (nothing on the device: a Back is a soft navigation in the same document) and sets it again when the list mounts from the cache
- **A sort change** stays `useSearchParam` (no server render): the new key has no seed, so its first page is fetched while the old rows stay on screen, dimmed (`keepPreviousData`); a failed first page shows the error with Try again in their place

## Options considered

- **Cursor pages with a hand-written hook, no Query:** rejected. It is the third fetch state machine, and keeping the loaded pages for Back needs a module cache with the same invalidation problem
- **Query for page data too (prefetch on the server, `HydrationBoundary`):** rejected for this feature (a non-goal of the spec). A refresh after every action would hydrate newer data over the loaded pages and collapse an endless list to its first page
- **Keying the provider by the user id:** rejected. A shared layout does not render again on a soft navigation, so the key would not change when another user signs in in a second tab; the list keys with `bfcacheId`, the details reachable only from the current user's rows and the options read on each mount close that instead
- **Virtualization (`@tanstack/react-virtual`):** not added; a few hundred rows of a card grid are fine, and it waits for a profile that shows a problem

## Consequences

- Two caches: the router's and Query's. Every new client caller of an action that changes items or collections makes the cache follow (`syncItemQueries`), and the guard test names the file that forgets
- `/favorites` and `/pinned` read one page per request; their counts come from `countFavoriteItems` and the counts per type
- The header count of a list is the server's total less the rows leaving at once, so the empty state never shows while rows remain to be loaded. A pinned group can show its old count for a frame between the cache drop and the refresh when the dropped row was beyond its first page
- The bundle grows by about 14 KB gzipped (the Query chunk), partly offset by the removed fetch code: 7.6 KB gzipped over the whole build
