# Current Feature: Row controls and colors

## Status

In Progress

## Goals

- `/favorites` and `/pinned`: each item row gets a pin and a star, each collection row a star, so nothing needs opening to change them. A set control is filled and always visible, an unset one shows on hover or focus, and always on touch
- A row that a control removes leaves at once and the toast offers Undo, only on the removal that makes it leave: the star on `/favorites`, the pin on `/pinned`
- Focus moves to the next row, the previous one, or the empty state when a row removes itself
- A set pin takes the colour of the item's type everywhere; the folder of a collection row takes the collection's accent, the colour of its card border

## Notes

- Collections have no pin (user's decision)
- Layout follows `FileRow`: controls are siblings of the trigger, after the date, with the star as the rightmost column
- Reviewed by the architecture reviewer (eleven findings: ten taken, Undo kept narrow, against its advice to cut it, because a mistap would otherwise lose the row with no way back on the page)
- Accepted: Undo re-stars, so the star date resets and the row returns at the top of Newest; every favorite collection is read with one row per item, with no limit; the collection toast may show just before its row leaves

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
