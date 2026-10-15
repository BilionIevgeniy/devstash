# Current Feature: Code Review Fixes (Build, Drawer, Collections Query)

Fixes from the code-reviewer findings 1–3.

## Status

In Progress

## Goals

- Make a fresh clone, CI or Vercel build work: add `"postinstall": "prisma generate"` and make the build run `prisma generate && prisma migrate deploy && next build`
- Fix the mobile drawer width: replace `w-64` in DashboardShell.tsx with `data-[side=left]:w-64` so it matches the 16rem desktop sidebar instead of 75% of the viewport
- Make the collections query bounded: use `_count` for itemCount, select only the type ids and resolve types with one `itemType.findMany`, add a `take` for the page grid, and give the sidebar its own small query (favorites plus the 4 newest)

## Notes

- `src/generated/prisma` is gitignored and nothing generates it today. It only works locally because the directory already exists
- `SheetContent` already sets `data-[side=left]:w-3/4`, which has higher specificity than `w-64`. Using the same variant lets `cn` merge the classes. `data-[side=left]:sm:max-w-64` may also be needed
- `getRecentCollections` is wrapped in `cache()` and used by both the sidebar and the page. Keep that in mind when splitting the queries
- Out of scope: findings 4–13 (Suspense, shared type mapping, Sidebar split, dead mock data, and so on)

## History

- Initial Setup: Next.js scaffold, removed default public assets, cleaned up globals.css and page.tsx, added context/ docs and CLAUDE.md
- Dashboard UI Phase 1: ShadCN UI setup (button, input), dark mode by default, /dashboard route with top bar (search + New Item, display only) and Sidebar/Main placeholders
- Dashboard UI Phase 2: Collapsible sidebar with item type links (/items/TYPE), favorite and recent collections, user avatar area, desktop toggle and mobile drawer (shadcn sheet and avatar)
- Dashboard UI Phase 3: Main area with 4 stats cards, collections grid (type icons and accent color derived from items), pinned items and 10 recent items, using mock data (added collectionId to mock items)
- Database Setup: Prisma 7 with Neon PostgreSQL (pg driver adapter, prisma.config.ts), initial schema with NextAuth models, many-to-many ItemCollection join table, two migrations (init, item_collections), idempotent seed script (system item types, demo user, collections, items, tags), scripts/test-db.ts for database checks
- Dashboard Collections: Collections grid and collection stats cards now load from Neon via Prisma (src/lib/db/collections.ts, src/types/collections.ts), card border color from the most-used item type, type icons for all types in a collection, /dashboard set to force-dynamic; items stats, pinned/recent items and sidebar still use mock data
- Dashboard Items: Pinned items, recent items (20 newest) and the items stats cards now load from Neon via Prisma (src/lib/db/items.ts, src/types/items.ts), item card icon and border color from the item type, tags sorted by name, pinned section hidden when empty; removed the mock helpers in dashboard-data.ts (formatShortDate moved to utils.ts) and shared the demo user email via src/lib/db/demo-user.ts; sidebar still uses mock data
- Stats & Sidebar: Sidebar item types (with per-type counts) and favorite/recent collections now load from Neon via Prisma (getSidebarItemTypes in src/lib/db/items.ts, getRecentCollections reused and wrapped in cache()), recent collections show a colored circle from their most-used item type, added a "View all collections" link, /dashboard layout set to force-dynamic; main-area stats were already database-backed; user area still uses mockUser
- Add Pro Badge to Sidebar: ShadCN badge component added (src/components/ui/badge.tsx); the Files and Images types in the sidebar show a subtle outlined uppercase "PRO" badge (Pro types listed in PRO_TYPE_NAMES in Sidebar.tsx), no Pro gating logic
