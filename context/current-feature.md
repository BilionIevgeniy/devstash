# Current Feature: Global Search / Command Palette

## Status

In Progress

## Goals

- Open the command palette with Cmd+K (Mac) / Ctrl+K (Windows)
- Fuzzy search across all items and collections
- Group results into an Items section and a Collections section
- Keyboard navigation: arrow keys, Enter to select
- Show the item type icon and the collection item count
- On select, navigate to the item drawer or the collection page
- Clicking the TopBar search input opens the palette
- Show a ⌘K hint in the search input placeholder

## Notes

- Spec: `context/features/global-search-spec.md`
- Use the shadcn `cmdk` component (Command)
- Client-side fuzzy search, with no server round-trips
- Pre-fetch the searchable data on app load
- Search data: items (id, title, type, content preview), collections (id, name, itemCount)
- Reuse the existing data fetching functions
- `search` is a planned rank 7 feature created by this spec: its folder, `FEATURE_RANKS` row and `docs/modules.md` section go in the commit with its first code

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
