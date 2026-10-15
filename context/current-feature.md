# Current Feature: Dashboard Streaming (Suspense)

Fixes from the code-reviewer findings 4 and 12.

## Status

In Progress

## Goals

- Wrap `<Sidebar />` in `<Suspense>` with a skeleton fallback inside `layout.tsx`, so the shell and top bar render before the sidebar queries finish
- Wrap each async dashboard section (stats, collections, pinned items, recent items) in its own `<Suspense>` with a matching skeleton, so each one streams in as soon as its query resolves
- Add the ShadCN `skeleton` component with the CLI, plus small skeleton components for the sidebar, the stats row and a generic section
- Remove the redundant `export const dynamic = "force-dynamic"` from `src/app/dashboard/page.tsx` (the layout already applies it to the segment)
- Commit the two pending tooling files (`.claude/skills/cleanup/SKILL.md` and `.claude/agents/code-reviewer.md`) as a separate `chore:` commit on the same branch

## Notes

- A route-level `loading.tsx` is not enough: it nests inside the layout, so it would not cover the sidebar queries, and it would hold the page back until all four sections resolve
- `DashboardShell` renders the `sidebar` node in two places (the desktop `<aside>` and the mobile drawer). Check that the Suspense boundary behaves correctly in both
- `PinnedItems` renders nothing when there are no pinned items, so its skeleton can cause a brief layout shift when the section turns out to be empty
- Read the streaming and `loading.js` docs in `node_modules/next/dist/docs/` before writing code (AGENTS.md)
- Out of scope: findings 5–11 and 13 (shared type mapping, Sidebar split, dead mock data, UI fixes, ContentType enum)

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
