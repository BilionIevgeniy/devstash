# Current Feature

## Status

Not Started

## Goals

<!-- Goals for the current feature go here -->

## Notes

<!-- Additional context, constraints or details from the spec go here -->

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
- Refactor Item Types, Sidebar and Mock Data: src/lib/mock-data.ts trimmed to mockUser and the demo email now comes from DEMO_USER_EMAIL everywhere (including prisma/seed-data.ts and scripts/test-db.ts); new src/lib/db/item-types.ts holds the shared item type select, toItemTypeInfo and getSidebarItemTypes (moved from items.ts) and is used by the items and collections queries; CollectionType removed in favor of ItemTypeInfo; demoUserItems and demoUserCollections replaced by one DEMO_USER_FILTER in demo-user.ts; Sidebar.tsx split into sidebar/TypesSection, CollectionsSection (now built from FavoriteLink and RecentLink), UserArea and shared (LINK_CLASS, ItemCount), with getInitials moved to src/lib/utils.ts; PRO_TYPE_NAMES stays in TypesSection
- UI Fixes from Code Review: ItemRow computes the icon tint with color-mix only when a type has a color (no more invalid "undefined1a", works with non-hex colors); CollectionCard reads "1 item" for a single item; CollectionsSection renders the Favorites and Recent groups only when they have entries; DashboardShell keeps the desktop sidebar mounted and toggles it with a class, so sidebar sections keep their open or closed state; the TopBar search input has aria-label "Search items"
- Auth Setup - NextAuth + GitHub Provider: NextAuth v5 (next-auth@beta) with @auth/prisma-adapter, split config for edge compatibility (src/auth.config.ts with the GitHub provider, src/auth.ts with the Prisma adapter and JWT sessions), handlers exported from src/app/api/auth/[...nextauth]/route.ts, /dashboard/* protected by src/proxy.ts with redirect to NextAuth's default sign-in page, Session type extended with user.id in src/types/next-auth.d.ts, auth env vars added to .env.example
- Auth Credentials - Email/Password Provider: Credentials provider added to the split auth config (placeholder authorize in src/auth.config.ts, real validation in src/auth.ts with Zod input check, bcryptjs compare and email normalised to lowercase, credentials fields declared so the default sign-in page renders Email and Password inputs), POST /api/auth/register (src/app/api/auth/register/route.ts) validates name, email, password (8-72 characters) and confirmPassword with Zod, returns 409 for an existing email (also on a Prisma P2002 race), hashes with bcryptjs (12 rounds) and returns { success, data, error } without the hash; zod added as a direct dependency; no migration needed as User.password already existed
