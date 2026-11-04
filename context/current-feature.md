# Current Feature: Add Items to Collections

## Status

In Progress

## Goals

- The create item dialog has a Collections input to pick none, one or several of the user's collections
- The edit item form has the same input, showing the item's current collections
- Creating an item links it to the chosen collections, in the same write as the item
- Saving an edit replaces the item's collections as a whole, as tags work today
- A collection id that isn't the user's is refused
- Changing only the collections counts as an unsaved edit: Save is enabled and the discard guard applies
- Collection counts on the dashboard and sidebar are up to date after a create or an edit
- A user with no collections sees an empty state in the input, and the form still works

## Notes

- Out of scope: the `/collections` and `/collections/[id]` pages
- `ItemCollection` moves from `collections` (rank 6) to `items` (rank 5), which holds the forms and writes: ADR 0008
- The forms mount in several places (top bar, type page, dashboard drawer, route drawer, full item page), so the options are not passed down as props
- Counts need no action change: both edit paths call `router.refresh()` after a save (`use-item-sheet`, `ItemDetailView`). The sidebar count updates just after the edit toast, as the cards already do (accepted)
- A collection created while the edit form stays open on the full item page appears only after the form is reopened (accepted, see ADR 0008)
- `src/components/ui` has no popover or command component; build the input on `dropdown-menu`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
