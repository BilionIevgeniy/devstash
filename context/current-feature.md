# Current Feature: Favorites Page

## Status

In Progress

## Goals

- Star icon button in the TopBar links to `/favorites`
- Protected `/favorites` route shows all of the user's favorited items and collections
- Compact list in VS Code/terminal style, not cards; each row has a type icon, title, type badge and date
- Separate Items and Collections sections with counts
- Clicking an item opens the ItemDrawer; clicking a collection goes to `/collections/[id]`
- Empty state when there are no favorites
- Sorted by most recently favorited (`updatedAt`)
- Monospace or semi-monospace font, high density, subtle hover, clean lines with no heavy borders

## Notes

- Spec: `context/features/favorites-spec.md`
- Placement: `/favorites` is a page that composes features, not a module (`docs/modules.md`). It goes in `src/app/(app)/favorites/`, reading from `items` and `collections` queries
- Route protection: add `/favorites/:path*` to the matcher in `src/proxy.ts` in the same change
- Loading: the route gets its own `loading.tsx` with a skeleton matching the list
- Queries: existing code only counts favorite items, and `getSidebarCollections` is shaped for the sidebar. Both features will probably need a new favorites query, scoped by `userId`
- Date: there is no `favoritedAt` column, so `updatedAt` stands in for it. Any edit moves a row up, and rows show `updatedAt` so the date matches the sort order
- Collection rows: collections have no item type, so they get a fixed icon and a "collection" badge
- Favorite toggle: out of scope. Nothing in the app sets `isFavorite` yet (only `prisma/seed-data.ts`), so the page shows seeded favorites until the toggle ships as the next feature
- No limit on favorites: the spec says "all" and `getPinnedItems` is unbounded too. A user with thousands of favorites gets a heavy page; a cap is the later fix
- Rows move on edit: saving an item in the drawer moves it to the top behind the open sheet, so after closing, focus can return to a row that is now off screen

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
