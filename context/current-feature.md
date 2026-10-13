# Current Feature

Dashboard Collections — @context/features/dashboard-collections-spec.md

## Status

Completed

## Goals

- Replace the mock collection data in the dashboard main area with real data from the Neon database via Prisma
- Create `src/lib/db/collections.ts` with data fetching functions
- Fetch collections directly in the server component
- Derive the collection card border color from the most-used content type in that collection
- Show small icons of all item types in that collection
- Keep the current design
- Update the collection stats display

## Notes

- Do not add the items underneath yet (pinned and recent items stay as they are)
- Layout reference: @context/screenshots/dashboard-ui-main.png

## History

- Initial Setup: Next.js scaffold, removed default public assets, cleaned up globals.css and page.tsx, added context/ docs and CLAUDE.md
- Dashboard UI Phase 1: ShadCN UI setup (button, input), dark mode by default, /dashboard route with top bar (search + New Item, display only) and Sidebar/Main placeholders
- Dashboard UI Phase 2: Collapsible sidebar with item type links (/items/TYPE), favorite and recent collections, user avatar area, desktop toggle and mobile drawer (shadcn sheet and avatar)
- Dashboard UI Phase 3: Main area with 4 stats cards, collections grid (type icons and accent color derived from items), pinned items and 10 recent items, using mock data (added collectionId to mock items)
- Database Setup: Prisma 7 with Neon PostgreSQL (pg driver adapter, prisma.config.ts), initial schema with NextAuth models, many-to-many ItemCollection join table, two migrations (init, item_collections), idempotent seed script (system item types, demo user, collections, items, tags), scripts/test-db.ts for database checks
- Dashboard Collections: Collections grid and collection stats cards now load from Neon via Prisma (src/lib/db/collections.ts, src/types/collections.ts), card border color from the most-used item type, type icons for all types in a collection, /dashboard set to force-dynamic; items stats, pinned/recent items and sidebar still use mock data
