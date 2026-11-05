# Current Feature: Sidebar Items Section

## Status

In Progress

## Goals

- The sidebar gets a collapsible Items section below Collections, in the style of the Collections section
- The section shows two groups, Favorites and Pinned, and never the rest of the items
- A group with no items is not shown; with neither group, the section is not shown
- Each group shows at most 5 items: Favorites by last starred, Pinned newest first
- A row shows the type icon in the type's color and the title, truncated to one line
- A click on a row opens that item at `/items/<type>/<id>`
- Favorites ends with a "View all favorites" link to `/favorites` when there are more than the limit
- Starring, unstarring, pinning, unpinning or deleting an item updates the section after the refresh those actions already do
- `SidebarSkeleton` reserves the new section, with no layout shift

## Notes

- The sidebar lives in `app-shell` (`components/Sidebar.tsx`, a server component; the sections are in `_internal/components/sidebar/`), which already reads `getSidebarItemTypes` and `getSidebarCollections`; `items` owns the reads, with a new sidebar read beside `getPinnedItems` and `getFavoriteItems`
- An item both starred and pinned shows in both groups
- The sidebar sits outside `ItemDrawerProvider`, so a row is a plain link, not a drawer trigger. No star or pin controls in the sidebar
- Pinned has no page of its own, so that group has no "View all" link
- Reuse `CollapsibleSection`, `LINK_CLASS` and the group label of `CollectionsSection`; `GroupLabel` is private to that file today
- The limit of 5 and the place below Collections are choices made at load, not from a spec
- A row from a type page or another item's full page opens the intercepted drawer over that page, even for another type; the drawer reads by id alone. On the item's own full page the row goes nowhere
- Accepted: after Esc on a drawer opened from a row, focus falls to `body`, as it does for cards

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
