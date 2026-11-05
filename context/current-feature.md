# Current Feature: Item drawer on mobile

## Status

In Progress

## Goals

- Every action of the item drawer is reachable on a phone: Edit was cut off and Delete was out of view
- Below `sm` the action bar shows icons only, the labels stay for screen readers
- Below `sm` the drawer takes the full width of the screen
- From `sm` up nothing changes

## Notes

- Cause: five labelled buttons in one row that does not wrap, in a sheet of `w-3/4`
- The drawer's class is shared by `ItemDrawerProvider` and `ItemRouteDrawer` through one constant
- `DeleteItemDialog` is already an icon button with a `sr-only` label, so it does not change

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
