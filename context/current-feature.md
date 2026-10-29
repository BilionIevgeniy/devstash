# Current Feature: Item Drawer

## Status

In Progress

## Goals

- Clicking an ItemCard opens a right-side shadcn Sheet drawer with that item's full data; there is no separate item page
- Works on both the dashboard and the items list (`/items/[type]`) pages
- Action bar: Favorite (star, yellow when active), Pin, Copy, Edit (pencil), Delete (trash, right-aligned), laid out as in `context/screenshots/dashboard-ui-drawer.png`
- A client wrapper component manages the drawer state, since the pages are server components
- Full item detail (content, collections, language, etc.) is fetched on click from `GET /api/items/[id]`, with an auth check. No page navigation
- The drawer shows a skeleton while fetching
- Display only for now: the code editor and per-type extras come later

## Notes

- Card data keeps coming from the server components as it does today; only the detail fetch is new
- Placement under architecture-rules.md:
  - Detail read: `getItemDetail(userId, id)` in `features/items/queries.ts`, scoped by userId; DTO type in `features/items/types.ts`
  - Route: `src/app/api/items/[id]/route.ts` stays thin (session, then one query call, 404 when the item isn't found or isn't the user's)
  - Drawer + client wrapper: `features/items/components/`, because two routes use them
  - Collections data on the detail view must come through `collections`' queries, not `prisma.collection` from `items`. `collections` (rank 6) sits above `items` (rank 5), so `items` can't import it. This needs a decision at `start`: compose in `app/`, or return only the collection names `items` can reach through its own `ItemCollection` relation
- The action-bar buttons render but have no behaviour yet; wiring them up is a separate feature
- `components/ui/sheet.tsx` and `skeleton.tsx` already exist
- Check the Next 16 route handler docs in `node_modules/next/dist/docs/` before writing `route.ts` (async `params`)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
