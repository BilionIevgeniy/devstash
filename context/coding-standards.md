# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations
- Use API routes when you need:
  - Webhooks (Stripe, GitHub, etc.)
  - File uploads with progress tracking
  - Long-running operations
  - Specific HTTP status codes or headers
  - Endpoints for future mobile/CLI clients
  - Third-party integrations
- Otherwise, fetch data directly in server components
- Dynamic routes for item/collection pages

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive in `src/app/globals.css`
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed

Example v4 configuration:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
}
```

## Architecture & File Organization

Feature-based architecture with strict one-way layering. Code is grouped by feature, and a feature may only depend on layers below it.

```text
src/
  app/                       Next.js routing only: page, layout, route.ts, loading, error
    (app)/                   authenticated routes (route group, not part of the URL)
      layout.tsx             app shell shared by every authenticated route
      dashboard/, profile/
        _components/         page-specific sections (private folder, not routable)
    sign-in/, register/, verify-email/, api/auth/
  features/
    auth/                    sign-in/register UI, auth actions, auth.ts, auth.config.ts, next-auth.d.ts,
                             services/ (account, registration, email verification, password reset, session)
    item-types/              TypeIcon, ItemTypeInfo, item type select and queries
    items/                   ItemRow, item queries, item types
    collections/             CollectionCard, collection queries, collection types
    app-shell/               DashboardShell, TopBar, Sidebar (+ sections, skeleton)
  components/ui/             shadcn/ui primitives only
  lib/                       shared infrastructure (prisma, utils, email, demo-user)
  proxy.ts                   Next.js proxy, must stay at the src root
```

### Layers (lowest to highest)

`lib` and `components/ui` < `item-types` and `auth` < `items` < `collections` < `app-shell` < `app`

- A layer may import from any layer below it, never from a layer above it
- `item-types` and `auth` share a rank and must not import each other
- `features/**` never imports from `@/app/**`
- `app/` composes features; it holds no business logic beyond page composition
- When two features need the same code, move it down to the lowest layer that both can import (this is how `item-types` came to exist)

### Inside a feature

```text
features/[feature]/
  domain/            pure business rules (the domain core, see below)
  components/        React components (PascalCase files)
  actions/           Server Actions ("use server" files export only async functions)
  services/          server-only operations that combine database, email, Redis or NextAuth calls (add it when a feature gets such a file)
  queries.ts         Prisma reads, always scoped by userId
  mutations.ts       Prisma writes, always scoped by userId
  schemas.ts         Zod schemas, no server-only imports
  types.ts           Types and interfaces
  _internal/         private implementation details of the feature (see "Public API")
```

Create only the files a feature actually needs.

### Public API of a feature

The public API of a feature is everything outside its `_internal/` folder. It is defined by a lint rule, not by a barrel file.

- Anything in `features/[feature]/_internal/` can be imported only from inside that feature; ESLint reports an error for any import from `app/`, `lib/`, `components/`, `proxy.ts` or another feature
- Put a file into `_internal/` when nothing outside the feature needs it (helpers, error classes, messages, sub-components, actions used by one component). Mirror the feature anatomy inside it (`_internal/components/`, `_internal/actions/`, `_internal/services/`)
- Everything else is public by default, so decide on purpose which files a new feature exposes
- Inside a feature, import siblings by relative path or full alias path; never create an `index.ts` to re-export them

### Domain core

Each feature keeps its business rules in `features/[feature]/domain/` as pure TypeScript. Examples: Free-tier limits, Pro gating, token expiry and cooldown rules, ranking and mapping logic.

- Domain files take plain values and return plain values: no I/O, no `Date.now()` or randomness (pass `now` in), no environment variables
- Domain files must not import Prisma or `@/generated/**`, `@/lib/prisma`, React, Next.js, `next-auth` or any other framework or SDK package
- Domain files may import only other `domain/` files, `types.ts` files and `@/lib/utils` of the same or a lower layer
- `queries.ts`, `mutations.ts`, `services/` and `actions/` are the adapters: they read and write the database, call the pure domain functions and return the result
- Create `domain/` only when a feature has a rule to put in it; new business rules (limits, gating, validation) start here, not in a component or a query

### Rules

- Import by full path (`@/features/items/components/ItemRow`). No `index.ts` barrel files: they slow down builds (the Next.js docs advise importing from specific files), hide server code leaking into client bundles and hide circular dependencies
- Server-only modules start with `import "server-only"`: every `queries.ts` and `mutations.ts`, every file in a `services/` folder (also under `_internal/`), `features/auth/auth.ts`, `lib/prisma.ts` and `lib/email.ts`. Importing one from a Client Component then fails the build instead of leaking into the bundle
- Circular imports are forbidden (`import/no-cycle`)
- `@/lib/prisma` is never imported in `features/**/components/**`; components get data through props or from queries called by a server component
- Route-specific UI lives in `app/[route]/_components/`. When a second route reuses it, move it into the matching feature
- Authenticated routes live in the `app/(app)/` route group under its shared shell layout. Every authenticated route must also be covered by the matcher in `src/proxy.ts`: widen it in the same change as the new route
- The shared action result type `ActionResult<T>` goes into `src/lib/` when the first non-auth Server Action is written
- Tests, when added, are colocated as `[name].test.ts`
- Layer order, the `_internal/` boundary, the domain core boundary and import cycles are enforced in `eslint.config.mjs` (`import/no-restricted-paths`, `no-restricted-imports` and `import/no-cycle`)

## Naming

- Components: PascalCase (`ItemCard.tsx`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Tailwind CSS for all styling
- Use shadcn/ui components where applicable
- No inline styles
- Dark mode first, light mode as option

## Database

- Use Prisma ORM for all database operations
- Always use `prisma migrate dev` for schema changes (not `db push`)
- Run `prisma migrate status` before committing to verify migrations are in sync
- Production deployments must run `prisma migrate deploy` before the app starts

## Data Fetching

- Server components fetch through the feature's `queries.ts` (Prisma, scoped by userId)
- Client components use Server Actions
- Validate all inputs with Zod

## Error Handling

- Use try/catch in Server Actions
- Return `{ success, data, error }` pattern from actions
- Display user-friendly error messages via toast

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
