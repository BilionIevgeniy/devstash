# Current Feature: Pinned Page and Sidebar Limits

## Status

In Progress

## Goals

- The top bar gets a pin icon link beside the star, with the label "Pinned", leading to `/pinned`
- `/pinned` lists every pinned item, split into one group per type, with the type icon, name and count in the group header
- Each group is an accordion: open by default, the header collapses and expands it, and open means all the group's items are shown
- Each group has its own sort, independent of the others: Newest, Oldest, A-Z, Z-A; a group's sort and open state survive a pin change
- A click on a row opens the item drawer; a group with no pins left disappears; with no pins at all the page shows "No pinned items yet."
- `/pinned` has its own `loading.tsx`, and the proxy matcher covers it
- Sidebar Items: Pinned ends with a "View all pinned" link to `/pinned` when there are more than 5
- Sidebar Collections: Favorites and Recent each show at most 5 rows
- Sidebar Collections: with more than 5, Favorites ends with "View all favorites" (`/favorites`) and Recent with "View all collections" (`/collections`)
- The sidebar has a clear text hierarchy, per the designer's table below, and `SidebarSkeleton` follows the new spacing with no layout shift

## Notes

- Date sort: `Item` has no `pinnedAt`, so Newest and Oldest go by the creation date, the order the sidebar and the dashboard already use. No migration
- Group order: by type name, the rule of `favorite-sort`, so removing a pin does not make a group jump
- `getPinnedItems` stops at 50 and reads the content for `canCopy`; `/pinned` needs every pin, so it gets its own read with the narrower select of `getFavoriteItems`
- `sidebar-items.ts` only limits favorites today; Pinned needs the same "one row past the limit", and `getSidebarItems` takes only 5 pins
- Collections: `getSidebarCollections` reads every favorite and 4 recent; both become 5 plus one row to detect more, and `SIDEBAR_RECENT_LIMIT` is removed in favor of `SIDEBAR_ITEMS_LIMIT`
- "View all collections" is shown always today and becomes conditional, so with 5 or fewer collections the sidebar no longer links to `/collections`; the dashboard's Recent Collections section still does
- With no collections, the Collections section is not shown, like Items
- Sidebar collection favorites go by last starred, not `updatedAt`: a star leaves `updatedAt` alone, so a new favorite of an old collection would fall past the limit
- `ListRow` and `SortSelect` moved to `app/(app)/_components/`: only routes use them, and `SortSelect` keeps the sort names of `items`
- `ItemDrawerProvider` wraps the empty state too, as on `/favorites`, so the last pin leaving through the open drawer does not unmount the sheet
- There is no `components/ui/accordion`; `CollapsibleSection` is private to `app-shell`
- Update `docs/modules.md` and `docs/architecture.md` (the proxy line, top bar, entry points)

### Sidebar hierarchy (designer review)

Today section headers are the same size as rows but dimmer, so they read as disabled rows. Uppercase group labels look louder than their parent, and "View all" looks like a row or a heading.

| Level | Classes |
| ----- | ------- |
| Section header | `text-sm font-semibold text-foreground rounded-md hover:bg-accent`, keep `px-2 py-1`; chevron `size-3.5 text-muted-foreground` |
| Group label | `px-2 pb-1 text-xs font-medium text-muted-foreground`, no `uppercase`, no `pt-2` |
| Row | `LINK_CLASS` + `text-foreground/80 hover:text-foreground`, stays 32px |
| View all | `flex h-7 items-center rounded-md pl-9 pr-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground`, inside its group |
| Count | `ml-auto text-xs tabular-nums text-muted-foreground` |
| PRO badge | Unchanged |

Spacing: label to rows 4px; between groups `space-y-4`; between sections `space-y-6`, also in `SidebarSkeleton`; no gap between rows. Do not go below `muted-foreground`: at `/70` the text fails AA. In light mode a count on a hovered row stays just below AA (4.34:1).

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
