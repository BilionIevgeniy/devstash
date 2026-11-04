# Current Feature: Collections Pages

## Status

In Progress

## Goals

- `/collections` shows all of the user's collections with the existing `CollectionCard`, in the same grid as the dashboard, plus a title, a count and an empty state
- `/collections/[id]` shows the collection's name, description and item count, then its items with the existing `ItemList` cards
- A collection that is missing, belongs to another user or has a malformed id shows the not-found page (the status stays 200, because `loading.tsx` streams the response, the same as `/items/[type]/[id]`)
- Clicking an item opens the drawer, and each new route has a `loading.tsx` skeleton that matches its layout
- `/collections` is added to the matcher in `src/proxy.ts`

## Notes

- Links already exist: the sidebar's "View all collections", the dashboard's "View all", the sidebar collection rows and `CollectionCard` all point to the right URLs and lead to a 404 until these pages exist. No link work is needed; check them once the pages are up
- Proxy: `/collections` is not in the matcher today, so without this change the new pages would not get the proxy's auth check
- Ownership: `getUserCollections` and `getCollectionById` go in `collections/queries.ts`; `getItemsByCollection` goes in `items/queries.ts`, because `items` owns `Item` and `ItemCollection`, and is scoped by `userId`. The page combines the two, which the ranks allow
- Drawer: `ItemDrawerProvider` without `basePath`, as on the dashboard. Item URLs need `/items/<type>/<id>` and a collection mixes types, so the type-page route drawer does not fit
- Mixed types: file and image items appear as regular cards here, not as gallery thumbnails or file rows
- Out of scope: edit, delete and favorite for collections, and pagination
- Deferred: "Ranking a collection's types reads every link" in `context/todo.md` stays deferred, since the fix needs raw SQL or a denormalized count, an architecture decision of its own. Update its note, which says to do it with the collections pages
- Docs: update the `collections` and `items` sections of `docs/modules.md`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
