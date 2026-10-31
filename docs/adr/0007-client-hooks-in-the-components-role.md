# 0007. Client hooks belong to the components role

- Status: accepted
- Date: 2026-10-31

## Context

Splitting the large client components (the size limits in `context/coding-standards.md`) moved state, refs and effects into hooks (`useFileUpload`, `useItemSheet`, `useDirtyCloseGuard`, `useUnsavedChanges`) and browser I/O into plain functions (`put-file`, `fetch-item-detail`). The role table had no place for either. A hook imports what a component imports: `react`, `next/navigation`, the feature's own `actions/`, `domain/`, `types.ts` and lower features. It is barred from what a component is barred from: Prisma, services and `queries.ts`. The one difference is direction: a hook feeds components, so it must not import them.

## Options

1. **Hooks inside the components role**, in `components/hooks/` (and `_internal/components/hooks/`), with one lint zone for the extra direction.
2. **A `hooks/` role folder per feature**, beside `components/`. It needs `roleFolders` entries in five zones, the Prisma ban and the 80-line size override to be extended together, and missing one fails silently (a hook importing Prisma with the lint green, or hooks at 50 lines while the components they came from get 80). It brings back a folder by technical kind inside each feature, which [ADR 0001](0001-modular-monolith-with-ranked-features.md) rejected for the app as a whole, and the browser helpers, which are not hooks, would still have no place.
3. **A `client/` role** for hooks and browser helpers. Every cost of option 2, and a client/server split that the rest of `components/` does not follow: server and client components already share the folder.

## Decision

Option 1.

- Hooks live in `components/hooks/use-<topic>.ts`, private ones in `_internal/components/hooks/`. They follow the import rules of `components/`, which the lint already applies to the subfolder
- A hook never imports a `.tsx` file. ESLint checks it with a zone in `intraFeatureZones`; a type a hook and its component share lives in the hook's file or in `types.ts`
- Browser-only helpers are `.ts` files at the root of `components/` (`put-file`, `fetch-item-detail`) and start with `import "client-only"`, the mirror of `server-only`. Neither hooks nor helpers carry `"use client"`: only the component that is the boundary does
- A hook with no feature knowledge, needed by two features, goes to `src/components/common/hooks/`. The folder is created with its first hook
- `src/components/common` falls under the Prisma and vendor SDK ban like feature components

## Consequences

- No new role to keep in sync across the lint blocks; the extra rule is one zone
- A hook cannot be found by a top-level folder name, only under `components/hooks/`
- The size limits treat hooks as UI (80 lines) and browser helpers as logic (50 lines), by glob in `eslint.config.mjs`
- A server component that imports a browser helper fails the build instead of throwing when the page renders
