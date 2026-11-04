# Current Feature: Favorite Toggle and Favorites Sorting

## Status

In Progress

## Goals

- Items get a server action and service that toggle `isFavorite`, scoped by `userId`
- Collections get the same
- `Item` and `Collection` get a nullable `favoritedAt` column: a toggle sets or clears it and leaves `updatedAt` unchanged; existing favorites are backfilled from their `updatedAt`
- The drawer's Favorite button in `ItemActionBar` works
- The Favorite button on the collection page in `CollectionHeaderActions` works
- Item cards can toggle: the static star on `ItemCard`, `ItemRow`, `ImageCard` and `FileRow` becomes a button
- Collection cards can toggle: the star on `CollectionCard` and the Favorite entry in `CollectionCardMenu`
- The card and the open drawer stay in sync, and the sidebar, dashboard and `/favorites` update after a toggle
- `/favorites` reads and shows `favoritedAt` (date added) instead of `updatedAt`
- `/favorites` gets client-side sorting by name, date and item type, with the sort logic in a pure, tested `domain/` function

## Notes

- UI rules: the button is disabled while its request runs, and a failure shows a plain-language toast. An optimistic update is fine here because rollback is cheap
- Card clicks: the card is a drawer trigger and the collection card is a stretched link, so the star must sit above them and a click must not open or navigate. `ItemDrawerTrigger` already has an `action` slot, which the copy button uses
- Drawer state: the star is read from the card's `item` in `useItemSheet`, so it needs updating alongside the detail, as `handleSaved` does
- Why `favoritedAt`: `updatedAt` is `@updatedAt` and collection lists sort by it, so a bump would make a starred card jump to the top and change the "Updated" date with no edit. `collection-fields.ts` already prevents this for unchanged saves
- Migration: use `prisma migrate dev` on the Neon `development` branch only. Pushing to `main` applies it to production
- Sorting: one control above both sections; the default is date, newest first; name sorts A-Z; item type groups by type, then by name within each type. Collections have no type, so they sort by name in item type mode. The choice resets on reload
- Unfavoriting on `/favorites`: a toggle from the open drawer removes the row behind the sheet. `ItemDrawerProvider` already wraps the empty state, so the sheet stays open
- Out of scope: Pin. `featuresDRAFT/pinned-spec.md` follows this feature's pattern, so the toggle should be easy to reuse
- Docs: `docs/modules.md` still lists the favorite as "will grow with" and the button as disabled

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
