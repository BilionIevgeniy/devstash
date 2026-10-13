# Current Feature

Stats & Sidebar — @context/features/stats-sidebar-spec.md

## Status

Completed

## Goals

- Main-area stats: already loaded from the database (`StatsCards` uses `getItemStats` and `getCollectionStats`), so nothing to do here
- Show the system item types in the sidebar with their icons and per-type item counts from the database, linking to `/items/[typename]`
- Load the sidebar's favorite and recent collections (with item counts) from the database instead of `src/lib/mock-data.ts`
- Keep the star icon for favorite collections; for recent collections show a colored circle based on the most-used item type in that collection
- Add a "View all collections" link under the collections list that goes to `/collections`
- Add the sidebar database functions to the existing `src/lib/db/items.ts`, using `src/lib/db/collections.ts` as a reference

## Notes

- Keep the current layout and design; only the data source changes
- The user area at the bottom of the sidebar is not in the spec and stays on `mockUser`
- Layout reference: @context/screenshots/dashboard-ui-drawer.png

## History

- Initial Setup: Next.js scaffold, removed default public assets, cleaned up globals.css and page.tsx, added context/ docs and CLAUDE.md
- Dashboard UI Phase 1: ShadCN UI setup (button, input), dark mode by default, /dashboard route with top bar (search + New Item, display only) and Sidebar/Main placeholders
- Dashboard UI Phase 2: Collapsible sidebar with item type links (/items/TYPE), favorite and recent collections, user avatar area, desktop toggle and mobile drawer (shadcn sheet and avatar)
- Dashboard UI Phase 3: Main area with 4 stats cards, collections grid (type icons and accent color derived from items), pinned items and 10 recent items, using mock data (added collectionId to mock items)
- Database Setup: Prisma 7 with Neon PostgreSQL (pg driver adapter, prisma.config.ts), initial schema with NextAuth models, many-to-many ItemCollection join table, two migrations (init, item_collections), idempotent seed script (system item types, demo user, collections, items, tags), scripts/test-db.ts for database checks
- Dashboard Collections: Collections grid and collection stats cards now load from Neon via Prisma (src/lib/db/collections.ts, src/types/collections.ts), card border color from the most-used item type, type icons for all types in a collection, /dashboard set to force-dynamic; items stats, pinned/recent items and sidebar still use mock data
- Dashboard Items: Pinned items, recent items (20 newest) and the items stats cards now load from Neon via Prisma (src/lib/db/items.ts, src/types/items.ts), item card icon and border color from the item type, tags sorted by name, pinned section hidden when empty; removed the mock helpers in dashboard-data.ts (formatShortDate moved to utils.ts) and shared the demo user email via src/lib/db/demo-user.ts; sidebar still uses mock data
- Stats & Sidebar: Sidebar item types (with per-type counts) and favorite/recent collections now load from Neon via Prisma (getSidebarItemTypes in src/lib/db/items.ts, getRecentCollections reused and wrapped in cache()), recent collections show a colored circle from their most-used item type, added a "View all collections" link, /dashboard layout set to force-dynamic; main-area stats were already database-backed; user area still uses mockUser
