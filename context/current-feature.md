# Current Feature

## Status

In Progress

## Goals

Card quick copy: a copy icon on item cards (`ItemCard` on type pages, `ItemRow` on the dashboard).

- Text items (snippet, prompt, command, note) copy their content; links copy their URL
- File and image items get no button: their only URL is signed and expires
- The button shows only when there is something to copy
- Clicking or pressing Enter/Space on the button copies without opening the drawer; Enter on the card still opens it
- Same feedback as the editor copy: Check icon for 2s, "Copied to clipboard" toast, error toast on failure

## Notes

- Pure rule `copyValueOf` in `items/domain/item-fields.ts`, with tests
- New view type `ItemCardData extends DashboardItem { copyValue }` with its own `cardItemSelect`, returned by `getPinnedItems`, `getRecentItems`, `getItemsByType`; `DashboardItem` and the detail/upload types are unchanged
- The editor's private `CopyButton` moves to `src/components/common/CopyButton.tsx` (with `className`), used by `editor` (`size-7`) and `items` (`size-9`, touch)
- The copy button is a sibling of the `role="button"` trigger, not a child (as in `FileRow`): `ItemDrawerTrigger` has an `action` slot over its corner; `ItemCardTrigger` fills it and strips `copyValue` from the item it passes to the drawer, so the content is sent once
- aria-label `Copy <title>`, like FileRow's `Download <name>`
- Trade-off: list pages now load item content; recorded under "Known risks" in `docs/architecture.md`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
