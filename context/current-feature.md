# Current Feature: Items List View

## Status

In Progress

## Goals

- Dynamic route `/items/[type]` (e.g. `/items/snippets`, `/items/notes`)
- Fetch and display only the items of the requested type
- Responsive grid of `ItemCard` components, two columns at `md` and up
- Each card has a left border colored by its item type
- Follow existing codebase patterns

## Notes

- Spec: `context/features/item-list-view-spec.md`
- Overview: a dynamic items listing page at `/items/[type]` that displays type-filtered items
- The route lives under `src/app/(app)/` (authenticated route group); the matcher in `src/proxy.ts` must be widened for it in the same change (`context/coding-standards.md`)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
