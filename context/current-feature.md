# Current Feature: Refactor Item Types, Sidebar and Mock Data

Cleanups from the code-reviewer findings 5, 6 and 7. Pure refactor: no visible change in the app.

## Status

In Progress

## Goals

- Remove the dead mock data: trim `src/lib/mock-data.ts` to `mockUser` only and take its email from `DEMO_USER_EMAIL`
- Point `prisma/seed-data.ts` and `scripts/test-db.ts` at `DEMO_USER_EMAIL` (relative import) so the demo email lives in one place
- Add `src/lib/db/item-types.ts` with the default type icon, a shared type `select` and `toItemTypeInfo`, and use it in `items.ts` and `collections.ts` instead of the duplicated `RawItemType` and inline mapping
- Move `getSidebarItemTypes` (with its system type ordering) from `items.ts` into `item-types.ts`
- Delete `CollectionType` and use `ItemTypeInfo` in `DashboardCollection`
- Replace `demoUserItems` and `demoUserCollections` with one exported user filter constant in `src/lib/db/demo-user.ts`
- Split `Sidebar.tsx`: move `TypesSection` (with `ProBadge` and `PRO_TYPE_NAMES`), `CollectionsSection` and `UserArea` into `src/components/dashboard/sidebar/`, with a small `shared.tsx` for `LINK_CLASS` and `ItemCount`; keep `Sidebar.tsx` as the async composition at its current path
- Move `getInitials` to `src/lib/utils.ts`
- Bring `CollectionsSection` under 50 lines by extracting the favorite and recent rows

## Notes

- Do it in three steps, each with its own plan and go: finding 7, then 5, then 6. Run `tsc --noEmit` and `npm run lint` after each step. The user runs the build and the browser check that the dashboard and sidebar look unchanged
- `PRO_TYPE_NAMES` stays with `TypesSection` for now. Move it when Pro gating needs it elsewhere
- `Sidebar.tsx` stays where it is so `layout.tsx` does not change
- The sidebar still uses `mockUser` for the user area until NextAuth lands
- Out of scope: findings 8–11 and 13 (UI fixes, ContentType enum)

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
- Code Review Fixes: package.json runs prisma generate on postinstall and prisma generate plus migrate deploy before next build; mobile drawer width fixed with data-[side=left]:w-64 (16rem like the desktop sidebar); collections queries now select only the type id per membership and resolve types with one itemType query, the dashboard grid is capped at 6 and the sidebar has its own getSidebarCollections (all favorites plus the 4 newest), so cache() was removed from getRecentCollections; .env.example uses sslmode=verify-full
- Dashboard Streaming: the dashboard layout wraps the sidebar in Suspense with a SidebarSkeleton fallback, and the page wraps stats, collections, pinned items and recent items in their own Suspense boundaries with skeletons sized to match the real cards (ShadCN skeleton component, SidebarSkeleton.tsx, DashboardSkeletons.tsx), so each part streams in as its query resolves; removed the redundant force-dynamic from the dashboard page (the layout sets it); added the code-reviewer agent and a green/red/yellow badge report line to the cleanup skill
