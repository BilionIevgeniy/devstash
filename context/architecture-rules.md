# Architecture Rules

A modular monolith. Code is grouped by feature, a feature imports only features of a lower rank, and ESLint checks the boundaries. Inside a feature every file has one role, and the role decides what it may import. This is the short rulebook that is always loaded. The guide with examples and the reference (operations table, background work, public API, known risks) are in [docs/architecture.md](../docs/architecture.md); what each module owns and exposes is in [docs/modules.md](../docs/modules.md); the reasons behind the rules are in [docs/adr/](../docs/adr/README.md). Specs in `context/features/` and `featuresDRAFT/` may name the paths of the original layout (see "Old paths in specs"): where they disagree with this file, this file wins.

## Layout

```text
src/
  app/                  entry points and page composition: page, layout, route.ts, loading, error
    (marketing)/        public homepage with its own `_components/` (planned)
    (app)/              authenticated routes under one shell layout, each route with `_components/`
    api/                route handlers: NextAuth, registration; later webhooks, export, AI streaming
  features/             the product, one folder per feature (see Ranks)
  components/ui/        shadcn/ui primitives only
  components/common/    hand-written UI with no feature knowledge: PaginationNav, EmptyState (planned)
  lib/                  feature-neutral infrastructure and vendor clients
  proxy.ts              Next.js proxy, stays at the src root; its matcher must cover every authenticated route
prisma/                 schema, migrations, seed
```

## Ranks

`lib` and `components/ui` < features by rank < `app`. A feature imports only features of a lower rank; features of the same rank never import each other. `features/**` never imports `@/app/**`; `lib` and `components/ui` never import a feature.

| Rank | Feature | Owns (Prisma models) | Status |
| ---- | ------- | -------------------- | ------ |
| 1 | `auth` | User, Account, Session, VerificationToken | exists |
| 2 | `billing` | Subscription, StripeEvent | planned |
| 3 | `item-types` | ItemType | exists |
| 3 | `files` | none (objects in R2 under `users/<userId>/`) | planned |
| 3 | `editor` | UserPreference | planned |
| 4 | `ai` | none | planned |
| 5 | `items` | Item, Tag, ItemTag | exists |
| 6 | `collections` | Collection, ItemCollection | exists |
| 7 | `search`, `import-export` | none | planned |
| 8 | `account` | none (delete-account flow: cancel Stripe, purge files, delete rows) | planned |
| 9 | `app-shell` | none | exists |
| 10 | `app` | routes only | exists |

- The numbers live in `FEATURE_RANKS` in `eslint.config.mjs`, which lists only folders that exist; a guard fails the lint when it and `src/features` differ. A planned feature gets its folder, its row and a section in [docs/modules.md](../docs/modules.md) in the commit with its first real code
- Not modules: `tags` (stay in `items` until a second feature needs them), `marketing` (`app/(marketing)/`), favorites, pagination, settings, dashboard (pages that compose features)
- Two features need the same code: move it down to the lowest rank both can import. Never sideways or up; compose in `app/` through props or slots (`items` fills the editor header slot with the `ai` Explain button)
- Until `billing` and `files` exist, `deleteUserAccount` stays in `auth`; create `account` in the change that adds the first higher dependency
- A feature writes only the models it owns and reads only its own models: no `prisma.<foreign model>`. Scalar columns through its own relation are fine; other features' data comes through their queries or services
- Limits and Pro checks read `billing/queries.ts` `getEntitlements`, never the JWT or the session. The Stripe columns still sit on `User` and nothing reads them; billing's first migration moves them to `Subscription`

## Inside a feature

```text
features/<name>/
  domain/<topic>.ts      pure rules: limits, gating, expiry, ranking, serializers
  schemas.ts             Zod shapes of every input
  types.ts               view and result types, JSON-safe
  queries.ts             reads of the feature's own models
  services/<topic>.ts    every write and every multi-step operation
  actions/<noun>.ts      Server Actions ("use server" files export only async functions)
  components/            React components, grouped by topic when the folder grows
  _internal/             private files, with the same role folders inside
  nextauth/              (auth only) NextAuth setup and the signed-in user
```

| Role | Does | Never imports |
| ---- | ---- | ------------- |
| `domain/` | Pure functions and constants; `now` is passed in | any package, Prisma, I/O, clock, env (lint); only `domain/`, `types.ts`, `lib/utils` |
| `schemas.ts` | Zod input shapes; composes the constants of `domain/` | queries, services, actions, components (lint) |
| `queries.ts` | Reads of own models: `userId` first, a DTO out, no writes | services, actions, components (lint) |
| `services/` | Writes, vendor/Redis/email/`fetch` calls, other features' data, limit checks, flows; `userId`, `ip`, `origin` come in as parameters | actions, components, `next/headers`, `next/cache`, `next/navigation` (lint) |
| `actions/`, `route.ts`, pages | Entry points: read the request, parse with a schema, make one call, shape the result, revalidate or redirect | Prisma, components (lint) |
| `components/` | UI; data through props or server-component queries, changes through actions | Prisma, services (lint) |

## Where does this go

1. `app/` composes only: session, queries, feature components. No Prisma, no business `if`
2. A pure rule, limit or constant (no I/O, clock, env or package) goes in `domain/`, with its test
3. An input shape goes in `schemas.ts`; a view or result type in `types.ts` (every other type: see "Where types live"); an email body in `_internal/emails/`
4. A read of the feature's own models goes in `queries.ts`, scoped by `userId` (the one exception: a read before sign-in keyed by email and a one-time token)
5. A write, a vendor call, a multi-step flow or another feature's data goes in `services/<topic>.ts`
6. `"use server"` files, `route.ts` and pages are thin: session, schema, one service call, revalidate. Webhooks and streams are routes
7. UI of one route goes in `app/<route>/_components/`; UI used across routes in the feature's `components/`
8. A vendor SDK goes in `lib/<vendor>.ts`; what the vendor means for the product (prices, prompts) stays in the feature's `domain/`
9. A file starts in `_internal/`; unsure means `_internal/`. Move it to the public folder of the same role when a second consumer, including `app/`, needs it
10. A new module is a folder, a `FEATURE_RANKS` row and a section in `docs/modules.md`, in the commit with its first code. If a rule blocks you, change the rule on purpose with a record in `docs/adr/`; never work around it

## Where types live

A type lives with the value it comes from.

| Type | Where | Examples |
| ---- | ----- | -------- |
| What a query or service hands to pages and components (view, DTO, action state) | `types.ts` | `ItemDetail` (items), `UserProfile` (auth), `DashboardCollection` (collections) |
| An input | `schemas.ts`, as `z.infer` next to its schema | `CreateItemInput` (items) |
| Derived from a constant, or the arguments or result of one function | the file of that constant or function | `CreatableTypeName`, `EditableFields` (items/domain), `ItemTypeRow` (item-types/domain), `EmailSendCheck` (auth/services), `ActionEmailCopy` (auth/_internal/emails) |
| Used by one file only | that file, not exported | `UpdateItemActionResult` (items/actions) |

There is no `types/` folder; `types.ts` splits into `types/<topic>.ts` only when it grows.

## Old paths in specs

Course specs name the paths of the original layout. Put the code here instead:

- `src/lib/db/*.ts` (items, collections): reads in `features/<feature>/queries.ts`, writes in `features/<feature>/services/<topic>.ts`. `src/lib/db/export.ts`: `import-export/services/export.ts`, composing export reads of `items` and `collections`
- `src/actions/*.ts` (items, collections, import, export): `features/<feature>/actions/<noun>.ts`, one call into a service
- `src/auth.ts` and `src/types/next-auth.d.ts`: `features/auth/nextauth/auth.ts` and `next-auth.d.ts`
- `src/lib/usage.ts` and its test: `billing/domain/limits.ts` with its test, plus `billing/queries.ts` `getEntitlements`. `isPro` is not put in the session or the JWT
- `src/app/api/stripe/checkout` and `portal`: `billing/actions/checkout.ts`, a service, `lib/stripe.ts`
- `src/app/api/upload/route.ts`: `files/actions/upload.ts` and `files/services/presign-upload.ts`; the browser PUTs to R2, with no byte proxy and no download proxy
- `src/app/settings/page.tsx`, `src/app/(dashboard)/settings/page.tsx`: `src/app/(app)/settings/page.tsx`
- `src/components/settings/*`: a `*Section` or dialog in the owning feature's `components/` (`billing`, `import-export`, `editor`), composed by the settings page
- `src/app/page.tsx` and `src/components/homepage/*`: `src/app/(marketing)/page.tsx` and `src/app/(marketing)/_components/`
- Stay where they are: `src/lib/stripe.ts`, `src/app/api/webhooks/stripe/route.ts` (thin, one call into `billing/services/`) and `src/app/api/export/route.ts` (sets the headers only)

## Rules

- Import by full path (`@/features/items/components/ItemRow`). No `index.ts` barrels. Never import another feature's `_internal/`
- Circular imports are forbidden (`import/no-cycle`)
- Prisma (`@/lib/prisma`, `@/generated/prisma`) is imported only by `queries.ts`, services and `lib`
- Server-only modules start with `import "server-only"`: every `queries.ts`, every file in `services/`, `auth/nextauth/auth.ts` and `session.ts`, and the `lib` files that touch secrets or Node
- Vendor SDKs (`resend`, `@upstash/*`, `stripe`, `openai`, `@aws-sdk/*`) are imported only inside `lib`
- Server Actions return `ActionResult<T>`, services return `OperationResult` (`src/lib/action-result.ts`). Expected failures are returned; unexpected ones throw and the entry point catches them
- Authenticated routes live in `app/(app)/`; widen the matcher in `src/proxy.ts` in the same change
- Tests are colocated as `[name].test.ts` (see "Testing" in `coding-standards.md`)

## What the lint enforces

`eslint.config.mjs` checks the layer order and `_internal/` boundary, the role directions inside a feature, the pure domain core, no Prisma in actions, components and `app/`, no request APIs in services, vendor SDKs only in `lib`, import cycles, and deprecated APIs of the installed packages (`@typescript-eslint/no-deprecated`).

Not checked by lint, so it is on the author and the reviewer: `userId` in every `where`, no writes in `queries.ts`, one service call per entry point, idempotent background jobs, and the ban on foreign models (planned as a lint rule).
