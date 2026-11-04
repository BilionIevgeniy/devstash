# Current Feature: Collection Actions and Grouped Items

## Status

In Progress

## Goals

- `/collections/[id]` has Edit, Delete and Favorite buttons in the header
- Edit opens a modal for the name and description, prefilled with the current values
- Delete asks for confirmation, then removes the collection and returns to `/collections`
- Deleting a collection never deletes its items: they only leave that collection
- Cards on `/collections` and the dashboard have a 3-dots menu with Edit, Delete and Favorite
- Clicking anywhere else on a card opens the collection page
- Favorite is only the icon/button for now and changes nothing
- `/collections/[id]` shows its items in one section per type, with the type's icon, name and item count
- Each section looks like that type's own page: images as a gallery with previews, files as rows with Download, every other type as cards
- A type with no items in the collection shows no section; an empty collection keeps its current message
- Clicking an item opens the same drawer as today, in every section

## Notes

- No migration: `ItemCollection` already cascades from `Collection`, so deleting a collection removes the links and keeps the items. The cascade rests on the migration `20261010120000_item_collections`; the service test pins that the delete is scoped by `{ id, userId }`, touches no items and fails on count 0
- Every update and delete is scoped by `userId`; an id from another user fails
- Needs `updateCollection` and `deleteCollection` (actions, services, schemas). The create schema's name and description rules are shared, not copied
- `CollectionCard` is one big `<Link>`, and a menu can't sit inside a link. The card needs a stretched link with the menu above it, and it stays a server component with a small client menu
- The create and edit forms share their fields, with the differences as props
- The edit and delete dialogs are shared by the page header and the card menu
- Favorite is shown disabled until the feature exists, on the page and in the card menu; the star still shows the saved `isFavorite`
- After a delete on the collection page, use `router.replace` so Back doesn't lead to a deleted page. On a card, the card disappears when the list refreshes
- The sidebar lists collections, so it must update after an edit or delete
- UI rules: pending labels (`Saving…`, `Deleting…`), the toast waits for the dialog to close, the form stays open on an error, Esc closes, and focus returns to the trigger
- Reuse `typeListing`, `ImageGallery`, `FileList` and `ItemList`, without new versions of them
- `getItemsByCollection` has no upload data, and the gallery and file list only load by type. Needs a new `items` service that reads the collection's items once, signs the uploads and returns them grouped by type, so no query runs per type
- The object key never leaves the server, the same as the gallery and file list services
- Sections are ordered most items first, like the type icons on the collection card; reuse `rank-types-by-usage` if it fits
- The header count stays as the total for the whole collection; sections have no "New item" button
- `ImageGallery` and `FileList` have only been used on type pages, under `ItemDrawerProvider` with `basePath`. The collection page has no `basePath`, so opening and deleting from the drawer must be checked there
- `loading.tsx` can't know which types a collection holds, so it keeps the card skeleton
- Update the `collections` and `items` sections of `docs/modules.md`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
