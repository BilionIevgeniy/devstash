# Current Feature

## Status

In Progress

## Goals

Fix the three worst findings of the UI review (2026-11-05):

- Card grids overflow a phone screen: a one-column grid has no explicit column, so `truncate` text widens it. Add `grid-cols-1` to the collection and item grids and their skeletons
- The Copy button of the item drawer does nothing: use `CopyButton`, with the value from the loaded detail. No button while loading or for an upload
- Focus lands on `body` when the item sheet closes: go back to the element that opened it, or to a sentinel before the page content when that element is gone

## Notes

- The route drawer of the type pages keeps the focus gap: its close handler also fires on browser Back, and the opener would have to come through the layout's provider. Recorded in `context/todo.md`
- The fallback lands at the top of the list, not on the neighbouring row: `useRowFocus` lives in `app/`, which `items` may not import

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
