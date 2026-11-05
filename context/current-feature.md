# Current Feature: Favorites Sort Options

## Status

In Progress

## Goals

- Items on the favorites page sort by: Newest, Oldest, A-Z, Z-A, Item type
- Collections on the favorites page have their own sort control: Newest, Oldest, A-Z, Z-A
- The items sort and the collections sort work independently of each other
- Newest stays the default for both lists
- Each sort control appears with its own section; the loading skeleton matches the new layout with no layout shift
- Both choices survive the last favorite leaving and coming back through the open drawer, as the sort does today

## Notes

- Today one select (Date, Name, Item type) above both lists reorders items and collections together; collections fall back to the name under the type sort
- "Date" means `favoritedAt`, when the item or collection was starred, as it does today
- Item type stays in the items sort: the request split name and date and did not ask to remove it. It does not apply to collections
- Name order stays case-insensitive with an explicit locale (`compareNames`); the sort stays client-side, with no new query or route
- Files: `src/app/(app)/favorites/_components/` (`FavoriteLists`, `FavoriteItems`, `FavoriteCollections`, `FavoriteSection`, `FavoriteSortSelect`), `src/app/(app)/favorites/loading.tsx`, `src/features/items/domain/favorite-sort.ts`, `src/features/collections/domain/favorite-sort.ts` and their tests

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
