# Current Feature: Mobile create menu

## Status

In Progress

## Goals

- Below `sm` the top bar shows one primary `+` that opens a menu with New item and New collection, instead of two buttons
- From `sm` up the top bar stays as it is
- Focus returns to `+` after Esc, Cancel and a create; the created toast still waits for the dialog to close

## Notes

- `CreateMenu` follows `CollectionCardMenu`: a non-modal menu, the dialog opens from `onSelect`
- Both create dialogs take an optional `controlled` with the contract of `CollectionDialogState`: they have no Radix trigger then, so they hand the focus back themselves
- Reviewed by the architecture reviewer (six findings, all taken)
- Accepted: on a phone New collection waits for the plan behind the disabled `+`; rotating past `sm` with a dialog open loses the focus on close, and an open menu loses its anchor

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
