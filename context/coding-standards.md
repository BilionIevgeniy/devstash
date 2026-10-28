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
  - Streaming responses (AI)
  - Reads fired from the client in parallel (typeahead, infinite scroll): Server Actions run one at a time
  - Specific HTTP status codes or headers
  - The public API for the future CLI and extensions
  - Third-party integrations
- File uploads: the browser sends the file straight to the storage (Cloudflare R2) with a presigned URL, so progress comes from the browser request. Never proxy file bytes through a Server Action or a route handler
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

A modular monolith. A guide with an annotated example and a checklist for a new feature is in `docs/architecture.md`; this section holds the rules. Code is grouped by feature, a feature may only depend on features of a lower rank, and the boundaries are checked by ESLint, not by habit. Inside a feature every file has one role, and the role decides what it may import.

```text
src/
  app/                       entry points only: page, layout, route.ts, loading, error
    (app)/                   authenticated routes (route group, not part of the URL)
      layout.tsx             app shell shared by every authenticated route
      dashboard/, items/[type]/, profile/
        _components/         page-specific sections (private folder, not routable)
    sign-in/, register/, verify-email/, ...
    api/                     route handlers: webhooks, streaming, public API (thin)
  features/
    auth/                    sign-in, register, account; nextauth/ (NextAuth setup, session helper, session types)
    item-types/              TypeIcon, ItemTypeInfo, type slugs, item type select and queries
    items/                   ItemRow, ItemCard, ItemList, item queries, item types
    collections/             CollectionCard, collection queries, collection types
    app-shell/               DashboardShell, TopBar, Sidebar (+ sections, skeleton)
  components/ui/             shadcn/ui primitives only
  lib/                       feature-neutral infrastructure and vendor clients
                             (prisma, utils, hash, client-ip, app-url, rate-limit, email, action-result)
  proxy.ts                   Next.js proxy, must stay at the src root
prisma/                      schema, migrations, seed (demo-user.ts lives next to the seed)
```

### Layers and ranks

`lib` and `components/ui` (rank 0) < features by rank < `app`

| Rank | Features | Why it sits there |
| ---- | -------- | ----------------- |
| 0 | `lib`, `components/ui` | imports no feature |
| 1 | `auth` | every feature with Server Actions imports `auth/nextauth/session`, so `auth` is alone at the bottom |
| 2 | `teams` (reserved) | needs only the session |
| 3 | `billing`, `api-keys`, `audit` (reserved) | `billing` gives the entitlements that the features above read |
| 4 | `item-types`, `tags`, `files` (`item-types` exists) | Pro gating of custom types and file limits read the entitlements |
| 5 | `ai` (reserved) | uses the tag vocabulary and the entitlements |
| 6 | `items` | uses item types, tags, files, ai |
| 7 | `collections` | |
| 8 | `search`, `import-export`, `sharing` (reserved) | read and compose items and collections |
| 9 | `account` (reserved) | orchestrates deleting an account: cancel the Stripe subscription, purge the files, then delete the rows |
| 10 | `app-shell` | |
| 11 | `app` | |

- A feature may import only features of a lower rank; features of the same rank must not import each other
- `features/**` never imports from `@/app/**`; `lib` and `components/ui` never import a feature
- `app/` composes features; it holds no business logic beyond page composition
- When two features need the same code, move it down to the lowest layer that both can import (this is how `item-types` came to exist)
- Reserved features have no lint row yet. `FEATURE_RANKS` in `eslint.config.mjs` lists only folders that exist, and a guard fails the lint when `src/features` and that table differ. Add the row in the commit that creates the folder
- Until `billing` and `files` exist, `deleteUserAccount` stays in `auth`; create `account` in the same change that adds the first higher dependency (the Stripe cancel or the file purge)

### Inside a feature

```text
features/[feature]/
  domain/            pure rules: limits, gating, permissions, expiry, ranking, serializers
  schemas.ts         Zod input schemas
  types.ts           plain view types and result types
  queries.ts         standalone reads of the feature's own Prisma models
  services/<topic>.ts  every write and every operation that touches more than the feature's own tables
  actions/<noun>.ts  Server Actions ("use server" files export only async functions)
  components/        React components (PascalCase files)
  nextauth/          (auth only) NextAuth setup and the signed-in user for the current request
  _internal/         private mirror of the same roles (see "Public API")
```

Create only the files a feature actually needs. `nextauth/` is not a role of the standard: it exists only in `auth`, and no other feature has an equivalent. A role file that passes about 300 lines, or that holds two unrelated topics, becomes a folder of topic files (no `index.ts`). A feature that holds two unrelated nouns is split into two features.

| Role | Responsibility | May import | Never |
| ---- | -------------- | ---------- | ----- |
| `domain/` | Pure functions and constants. Plain values in, plain values out; `now` is passed in | other `domain/` files, `types.ts`, `lib/utils` | any package (react, zod, node:*, SDKs), Prisma, I/O, clock, env (lint) |
| `schemas.ts` | Zod shapes of every input: form, action, route, searchParams, AI output. It composes the constants of `domain/` (lengths, limits) instead of repeating them | `domain/`, `zod` | queries, services, actions, components (lint); server-only code |
| `types.ts` | View types, DTOs and result types, JSON-safe | `lib/action-result` | Prisma types |
| `queries.ts` | A read of the feature's own models for a page, a GET route or a service. `userId` first, a DTO out, no writes; a mapper from a Prisma row sits next to its `select` | `domain/`, `types.ts`, `lib/prisma` | services, actions, components (lint) |
| `services/` | The operation itself: every write, a vendor, Redis, email, NextAuth or `fetch` call, another feature's data, a limit or permission check, a flow of several steps. `verbNoun(userId, input)`; `ip`, `origin` and `userId` come in as parameters | queries, domain, types, schemas, `lib`, features of a lower rank, sibling services (no cycles) | actions, components (lint); `next/headers`, `next/cache`, `next/navigation` (lint) |
| `actions/`, `route.ts`, pages | Entry points: parse the input with a schema, read the request (session, headers, cookies, searchParams), apply a plain per-IP limit when it does not depend on the operation (registration), make the call into a service or a query, shape the result, revalidate or redirect | everything below | Prisma (lint), components (lint) |
| `components/` | UI. Data comes through props, or from queries called by a server component; changes go through actions | own `actions/`, `types.ts`, `schemas.ts`, `domain/`, `queries.ts` (server components only), lower features, `components/ui` | Prisma, services (lint) |
| `_internal/emails/` | Pure builders that return `{ subject, html, text }`; the service sends them through `lib/email.ts` | — | I/O |

Expected failures (wrong password, expired link) are returned as a result; unexpected ones throw and are caught by the entry point.

### Which file does a new function go in

1. No I/O, clock, environment or package (including `node:*` and `zod`), plain values in and out: `domain/<topic>.ts`.
2. A helper that needs a package or `node:*` (hashing, crypto): `lib/<name>.ts` when it is generic and has no product words, otherwise `_internal/<name>.ts`.
3. A Zod input shape: `schemas.ts`. A view or result type: `types.ts`. An email body: `_internal/emails/`.
4. A standalone read of this feature's own Prisma models, including a read that a flow needs: `queries.ts`. Scope it by `userId`; the one exception is a read before sign-in that is keyed by an email address and a one-time token (`getAccountState`, `isVerificationTokenValid`, `isPasswordResetTokenValid` in `auth`), where holding the token is the authorization
5. Anything else that does work: `services/<topic>.ts`. That is every write, any call to a vendor, Redis, email, NextAuth or `fetch`, another feature's data, a read that must share a transaction with a write, a decision that needs two sources
6. Anything that reads the request (session, headers, cookies, searchParams) or is `"use server"`: an entry point (`actions/<noun>.ts`, `route.ts`, a page, `auth/nextauth/session.ts`). It passes `userId`, `ip` and `origin` as plain values into one call
7. A vendor client with no feature knowledge: `lib/<vendor>.ts`
8. Used only inside this feature: `_internal/<same role>/`. Needed by two features: move it down to the lowest rank both can import

### Operations

| Operation | Where it goes |
| --------- | ------------- |
| Page read: list or detail | `queries.ts`, `getX(userId)`, called by the server component; wrap in `cache()` when sections share it |
| Filtered, paginated or searched read | `queries.ts`; the `searchParams` parser in `schemas.ts`; page math in `domain/`; cross-feature search in `search/queries.ts` |
| Read fired from the client (typeahead) | `app/api/<feature>/route.ts` GET that calls the query |
| Create, update or delete one entity | `actions/<noun>.ts` parses with `schemas.ts` and calls `services/<topic>.ts`, which writes with the owner in the `where` and checks the limit; the action revalidates |
| Several steps or side effects | `services/<topic>.ts`; the entry point calls exactly one function |
| Pure rule, limit, permission | `domain/` (the plan lookup that feeds it is a query or a service) |
| Free or Pro gate | `billing/domain/limits.ts` plus `billing/queries.ts` `getEntitlements`; the caller counts its own rows and passes the count |
| Import | `import-export/services/import.ts`; parsing is pure in `domain/`; writes go through the owners' services, never straight to Prisma |
| Export JSON or ZIP | `import-export/queries.ts` plus `services/export.ts`; `app/api/export/route.ts` only sets the headers |
| File upload | `files/actions/upload.ts` then `files/services/presign-upload.ts` then `lib/r2.ts`; the browser PUTs to R2 |
| Signed download URL | a service of the feature that owns the item: it checks ownership, then asks `files` for the URL |
| AI, one answer | `ai/actions` then `ai/services/<operation>.ts`; prompts in `ai/domain/`; the output schema in `ai/schemas.ts`; the quota check is in the service |
| AI, streaming | `app/api/ai/<operation>/route.ts` calls the same service; the quota is checked before the stream opens |
| Stripe checkout or portal | `billing/actions/checkout.ts` then a service then `lib/stripe.ts` |
| Stripe webhook | `app/api/webhooks/stripe/route.ts` verifies the raw body and calls one service in `billing/services/`, idempotent by event id; the route holds no Prisma and no business `if` |
| Who is signed in | `getSessionUser()` in `auth/nextauth/session.ts`, read at the entry point and passed down as `userId` |
| Ownership | `userId` in the `where` of every query and write; a foreign id answers not found |
| Rate limit | policy in `domain/rate-limits.ts`, mechanism in `lib/rate-limit.ts`; a limit that needs nothing but the IP is applied by the entry point; a limit that depends on the account or the address (per user, per address, and the per-IP check that must run after the per-address one) lives in the service, which receives `ip` as a parameter |
| Email | the template in `_internal/emails/`, sent by a service through `lib/email.ts` |
| Background or long job | see "Background work" |
| Public API | see "Public API" |

### Background work

- `after()` runs after the response inside the same function invocation, bounded by the platform's maximum duration, with no retry. Use it only for work that may be lost: analytics, best-effort audit lines
- Work that must not be lost (purging a deleted account's files, a sync that has to land): write the intent to the database first, then process it from a cron route or a queue with retries. The job takes ids only and is idempotent
- A webhook is already retried by its sender (Stripe), so its handler is idempotent and answers fast

### Public API

There is no `public-api` feature: it would only wrap the owners' services. Until the first consumer exists, build nothing; when it does:

- `app/api/v1/**/route.ts` are thin entry points: authenticate the key, apply the per-key limit, parse with the owner's `schemas.ts`, call the same queries and services as the actions, serialize
- Anything sent over HTTP goes through an explicit serializer in the owner's `domain/` (plain to plain, versioned by file name); `types.ts` view types are UI-internal, not a contract
- API-key authentication is a small `api-keys` feature that returns a `userId`; services stay unaware of how the caller signed in

### Integration clients

- One file per vendor in `lib/<vendor>.ts` (a folder from the second file): a singleton that reads its own environment variables lazily, starts with `import "server-only"` and holds no product words
- What a vendor means for the product stays in the feature: price mapping in `billing`, prompts in `ai/domain`, the key scheme for stored files in `files/domain`
- Vendor SDKs (`resend`, `@upstash/*`, `stripe`, `openai`, `@aws-sdk/*`) are imported only inside `lib` (lint)

### Public API of a feature

The public API of a feature is everything outside its `_internal/` folder. It is defined by a lint rule, not by a barrel file.

- Anything in `features/[feature]/_internal/` can be imported only from inside that feature; ESLint reports an error for any import from `app/`, `lib/`, `components/`, `proxy.ts` or another feature
- Put a file into `_internal/` when nothing outside the feature needs it (helpers, token and password helpers, error classes, messages, email templates, sub-components, actions used by one component). Mirror the feature anatomy inside it (`_internal/components/`, `_internal/actions/`, `_internal/services/`, `_internal/emails/`)
- Everything else is public by default, so decide on purpose which files a new feature exposes
- Inside a feature, import siblings by relative path or full alias path; never create an `index.ts` to re-export them

### Domain core

Each feature keeps its business rules in `features/[feature]/domain/` as pure TypeScript. Examples: Free-tier limits, Pro gating, token expiry and cooldown rules, ranking and mapping logic.

- Domain files take plain values and return plain values: no I/O, no `Date.now()` or randomness (pass `now` in), no environment variables
- Domain files import no package at all (React, Next.js, `next-auth`, `zod`, `node:*`, Prisma, SDKs): the lint rule is an allowlist, so a new package is refused without being named
- Domain files may import only other `domain/` files, `types.ts` files and `@/lib/utils` of the same or a lower layer
- `queries.ts`, `services/` and `actions/` are the adapters: they read and write the database, call the pure domain functions and return the result
- Create `domain/` only when a feature has a rule to put in it; new business rules (limits, gating, validation) start here, not in a component or a query

### Rules

- Import by full path (`@/features/items/components/ItemRow`). No `index.ts` barrel files: they slow down builds (the Next.js docs advise importing from specific files), hide server code leaking into client bundles and hide circular dependencies
- Server-only modules start with `import "server-only"`: every `queries.ts`, every file in a `services/` folder (also under `_internal/`), `features/auth/nextauth/auth.ts` and `session.ts`, and the `lib` files that touch secrets or Node (`prisma.ts`, `email.ts`, `hash.ts`, `rate-limit.ts`). Importing one from a Client Component then fails the build instead of leaking into the bundle
- Circular imports are forbidden (`import/no-cycle`)
- Prisma (`@/lib/prisma`, `@/generated/prisma`) is imported only by `queries.ts`, services and `lib`; never by actions, components or `app/`
- Route-specific UI lives in `app/[route]/_components/`. When a second route reuses it, move it into the matching feature
- Authenticated routes live in the `app/(app)/` route group under its shared shell layout. Every authenticated route must also be covered by the matcher in `src/proxy.ts`: widen it in the same change as the new route
- Server Actions return `ActionResult<T>` and services return `OperationResult`, both from `src/lib/action-result.ts`
- Tests, when added, are colocated as `[name].test.ts`
- Specs in `context/features/` and in `featuresDRAFT/` record what was planned when they were written and may name old paths (`lib/db/*.ts`, `src/auth.ts`, `src/lib/usage.ts`, `app/api/upload`). Where they disagree with this file, this file wins

### What the lint enforces

`eslint.config.mjs` builds its zones from one rank table (`FEATURE_RANKS`) and checks:

- the layer order and the `_internal/` boundary (`import/no-restricted-paths`)
- the direction of the roles inside a feature: queries and schemas do not import services, actions or components; services do not import actions or components; actions do not import components; components do not import services
- the domain core: no package import, only `domain/`, `types.ts` and `lib/utils`
- no Prisma in actions, components and `app/`; no `next/headers`, `next/cache` or `next/navigation` in services; vendor SDKs only in `lib`
- import cycles (`import/no-cycle`)

Not checked by lint, so it is on the author and the reviewer: no writes in `queries.ts`, one call into a service per entry point, `userId` in every `where`, a service taking `userId`, `ip` and `origin` as parameters, idempotent background jobs.

### Known risks

- **ESLint 10.** The rules above rest on `eslint-plugin-import`, whose peer range ends at ESLint 9 (version 2.32.0, the latest on npm when this was written); it comes in through `eslint-config-next`. Stay on ESLint 9 until the plugin supports 10. `eslint-plugin-boundaries` declares `eslint >=6`, but it was not evaluated against these rules, and it was not checked whether it can replace `import/no-cycle`. `FEATURE_RANKS` is plain data, so a change of plugin replaces only the code that generates the zones
- **Teams.** Every query takes `userId`. Moving to a workspace or an `Actor` parameter touches every query and the schema; decide before the first shared collection
- **Linear ranks.** One number per feature is easy to read but brittle; past about twelve features an explicit list of allowed dependencies per feature may fit better
- **The services threshold.** Almost every write goes through a service, so some will be a few lines. That is the price of one rule with no exceptions

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

- Server components fetch through the feature's `queries.ts` (Prisma, scoped by userId; the exception is in "Which file does a new function go in")
- Client components use Server Actions
- Validate all inputs with Zod; the schemas live in the feature's `schemas.ts`

## Error Handling

- Use try/catch in Server Actions
- Return the `ActionResult<T>` pattern `{ success, data, error }` from actions
- Display user-friendly error messages via toast

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible
