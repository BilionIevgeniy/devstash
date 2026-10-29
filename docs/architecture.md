# Architecture guide

How DevStash is organized, where each kind of code lives, and what to create when you add something. This guide explains and shows by example. The short rulebook behind it is [context/architecture-rules.md](../context/architecture-rules.md), which is always loaded, and where the two disagree the rulebook wins. What each module owns and exposes is in [modules.md](modules.md), the one-page overview is [arc42-lite.md](arc42-lite.md) and the reasons behind the rules are in [adr/](adr/README.md). The long reference (operations, background work, public API, known risks) is at the end of this guide.

## The idea in one minute

- Code is grouped by **feature** (`auth`, `items`, `collections`, ...), not by technical type.
- Inside a feature every file has one **role** (a pure rule, a read, an operation, a form handler, a component). The role decides what the file may do and what it may import.
- Features are **ranked**. A feature imports only features of a lower rank, so dependencies point one way and never form a loop.
- `src/app/` only routes and composes pages. It holds no business logic.
- ESLint checks all of this. A wrong import fails `npm run lint`, so the structure does not depend on anyone remembering it.

## Map of the repository

```text
src/
  app/            routes: page.tsx, layout.tsx, route.ts. Composes features, no business logic
    (app)/        authenticated pages (dashboard, items/[type], profile) under one shared layout
    api/          route handlers: NextAuth, registration, item detail, later webhooks and streaming
  features/       the product, one folder per feature
    auth/         sign-in, registration, email verification, password reset, account
    item-types/   item type icons, info, URL slugs and queries
    items/        item rows, cards, the item list and queries
    collections/  collection cards and queries
    app-shell/    dashboard shell, top bar, sidebar
  components/ui/  shadcn/ui primitives only
  lib/            feature-neutral infrastructure and vendor clients (prisma, email, rate-limit, hash, ...)
  proxy.ts        guards /dashboard, /profile and /items; must stay at the src root
prisma/           schema, migrations, seed
scripts/          one-off database scripts
context/          the rulebooks (architecture-rules.md, coding-standards.md), the current feature and the history
docs/             this guide and audit reports
```

## How a request travels

**Showing a page** (the profile page):

```text
app/(app)/profile/page.tsx
  -> _components/ProfileInfo.tsx        server component
     -> getSessionUser()                auth/nextauth/session.ts   who is signed in
     -> getUserProfile(userId)          auth/queries.ts            reads Prisma, returns a plain object
```

**Submitting a form** (forgot password):

```text
components/ForgotPasswordForm.tsx       client component
  -> requestPasswordReset               auth/_internal/actions/password-reset.ts   Server Action, the entry point: parses, reads the IP and origin
     -> emailSchema                     auth/schemas.ts                            validates the input
     -> requestPasswordResetLink        auth/services/password-reset.ts            the operation, the only call the action makes
        -> checkEmailSend(..., ip)      auth/services/email-rate-limit.ts          rate limits
        -> getAccountState(email)       auth/queries.ts                            read
        -> sendPasswordResetLink        auth/services/password-reset.ts            token, database, email
           -> buildPasswordResetEmail   auth/_internal/emails/                     pure: builds subject, html, text
           -> sendEmail                 lib/email.ts                               the only place that talks to Resend
```

**Registration** is a route handler (`app/api/auth/register/route.ts`) instead of a Server Action: it parses with `registerSchema`, applies the per-IP limit and calls the `registerAccount` service.

The pattern is always the same: an **entry point** (page, action or route) reads the request, a **service** does the work, **queries** read, **domain** decides, **lib** talks to the outside world. A service never reads the request itself: the entry point passes it `userId`, `ip` and `origin` as plain values.

## One feature explained: `features/auth/`

```text
features/auth/
  nextauth/                  NextAuth itself; only auth has this folder
    auth.ts                  the NextAuth setup: Prisma adapter, credentials and GitHub, JWT callbacks,
                             sign-in rate limit. Exports auth, signIn, signOut and the route handlers
    auth.config.ts           the part without database access (providers, sign-in page); proxy.ts uses it
    session.ts               getSessionUser(): the signed-in user of this request, or a redirect to /sign-in
    next-auth.d.ts           types: adds id and authenticatedAt to the session user
  actions/
    sign-in.ts               Server Actions the rest of the app calls: sign in, re-authenticate, sign out
  components/                forms, dialogs and cards (SignInForm, RegisterForm, ChangePasswordForm, ...)
  domain/                    pure rules: password length, token expiry and links, rate-limit policies,
                             the recent-sign-in window, when to resend a verification
  services/                  operations: registration, email verification, password reset, account
                             (change password, delete), the email-send rate limit
  queries.ts                 reads: getUserProfile, and the reads made before sign-in (see the standard)
  schemas.ts                 Zod schemas of every input
  types.ts                   AuthActionState, AccountState, UserProfile
  _internal/                 private to auth (see the next section)
    actions/                 Server Actions used only by auth's own forms
    components/              CheckEmailNotice
    services/                github-grant: revokes the app's authorization on GitHub
    emails/                  the emails: pure builders of subject, html and text
    token.ts, password.ts    generate and hash tokens; hash passwords with one bcrypt cost
    errors.ts, messages.ts   sign-in error classes and messages
```

The other features are smaller versions of the same thing: `items` has `components/`, `queries.ts` and `types.ts`; `collections` adds a `domain/` file. A feature starts small and grows the folders it needs.

## Public and `_internal`

Everything in a feature that is **not** in `_internal/` is its public face: other features and `app/` may import it. Anything in `_internal/` may be imported only from inside the same feature, and ESLint refuses an import from anywhere else.

That is why `auth` has two `actions` folders:

- `actions/sign-in.ts` is public because outside code uses it: the sign-in page and the sidebar's user menu.
- `_internal/actions/` holds the actions that only auth's own forms call.

The folder names are the same because the role is the same; the difference is only who may import it. A new file starts private, in `_internal/`, and unsure means `_internal/`. When another feature or `app/` needs it, move the file to the public folder of the same role. If more than one file per feature has to be promoted across the next three features, the `_internal/<role>/` mirror is dropped.

## Where does X go

| I want to... | Put it in |
| ------------ | --------- |
| show data on a page | `queries.ts`, called by a server component |
| validate an input | `schemas.ts` |
| save or change data | `services/<topic>.ts`, called by an action |
| handle a form | `actions/<noun>.ts` (`"use server"`) |
| express a rule, limit or constant | `domain/` (pure: no database, no clock, no packages) |
| send an email | the template in `_internal/emails/`, sent by a service through `lib/email.ts` |
| call an outside service | a client in `lib/<vendor>.ts`, used by a service |
| know who is signed in | `getSessionUser()` in a page or an action; pass `userId` down |
| a webhook, a stream or a public API | `app/api/.../route.ts`, thin, one call into a service |
| something only one feature uses | `_internal/<same role>/` |

The ten placement rules are "Where does this go" in [context/architecture-rules.md](../context/architecture-rules.md). The full table with every operation (uploads, AI, Stripe, imports, background jobs) is "Operations" in the Reference below, next to the longer "Which file does a new function go in".

## Adding a new feature

1. **Pick the rank.** The table "Ranks" in [context/architecture-rules.md](../context/architecture-rules.md) lists the existing and the planned features. A feature imports only lower ranks.
2. **Create `src/features/<name>/`** with only what you need. Start with `components/`, `queries.ts` and `types.ts`; add `schemas.ts`, `services/`, `actions/` and `domain/` when the first thing that belongs there appears.
3. **Add the feature to `FEATURE_RANKS`** in `eslint.config.mjs`. The lint fails until the folder and the table agree. Add the module's section to [modules.md](modules.md) in the same commit.
4. **Add the pages** under `src/app/(app)/<route>/` and widen the `matcher` in `src/proxy.ts` so the route is protected. Pages only compose.
5. **Change the database** in `prisma/schema.prisma` and run `npx prisma migrate dev --name <what>` (never `db push`); update `prisma/seed.ts` if the demo data needs it.
6. **Write the code by role:** reads in `queries.ts` (scoped by `userId`), writes in `services/`, inputs in `schemas.ts`, rules in `domain/`, the form handler in `actions/`.
7. **Check:** `npx tsc --noEmit`, `npm run lint`, `npm run test` (all green before a commit) and `npm run build`. The build also runs `prisma migrate deploy`, which applies pending migrations to the database named in `.env`.
8. **Record it** in `context/feature-history.md` when the feature is done (see `context/ai-interaction.md` for the workflow).

Adding an operation to an existing feature is the same without steps 1 to 5: input schema, then the service, then the action, then the component that calls it.

## What protects the structure

`npm run lint` fails when:

- a feature imports a feature of the same or a higher rank, or `app/`;
- code outside a feature imports its `_internal/`;
- a role imports a role above it (a service importing an action, a component importing a service);
- a `domain/` file imports any package (its colocated `*.test.ts` files may import `vitest`);
- an action, a component or a page imports Prisma;
- a service imports `next/headers`, `next/cache` or `next/navigation`;
- an SDK of a vendor (Resend, Upstash, Stripe, OpenAI, AWS) is imported outside `lib/`;
- two files import each other in a loop.

What lint cannot see (no writes in `queries.ts`, one call into a service per entry point, `userId` in every query) is on the author and the reviewer. The exact list is "What the lint enforces" in the Reference below.

## Reference

The detailed rules, moved here from `context/coding-standards.md` so that the always-loaded rulebook stays short. The rulebook wins where the two disagree.

### Why the ranks are in this order

- **1 `auth`:** every feature with Server Actions imports `auth/nextauth/session`, so `auth` sits alone at the bottom
- **2 `billing`:** gives the entitlements (limits, Pro) that everything above reads
- **3 `item-types`, `files`, `editor`:** building blocks. Pro gating of custom types and file limits read the entitlements; the editor needs only the session
- **4 `ai`:** uses the entitlements (Pro gate, quota) and the editor's `MarkdownPreview`. It takes the content as input and never reads items, which is why it sits below `items`
- **5 `items`:** uses item types, files, the editor and `ai`
- **6 `collections`:** uses items
- **7 `search`, `import-export`:** read and compose items and collections; they call the owners' queries and services and never read the tables themselves
- **8 `account`:** orchestrates deleting an account: cancel the Stripe subscription, purge the files, then delete the rows
- **9 `app-shell`:** composes the others for every authenticated page

`teams`, `api-keys`, `audit` and `sharing` had no spec and no row. They get a rank when their first code exists.

### Inside a feature: details

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
3. A Zod input shape: `schemas.ts`. A view or result type: `types.ts`. An email body: `_internal/emails/`. A type lives with the value it comes from: an input type is `z.infer` next to its schema, a type derived from a `domain/` constant (`CreatableTypeName` from `CREATABLE_TYPES`) stays in that `domain/` file, and a type used by one file stays unexported there.
4. A standalone read of this feature's own Prisma models, including a read that a flow needs: `queries.ts`. Scope it by `userId`; the one exception is a read before sign-in that is keyed by an email address and a one-time token (`getAccountState`, `isVerificationTokenValid`, `isPasswordResetTokenValid` in `auth`), where holding the token is the authorization.
5. Anything else that does work: `services/<topic>.ts`. That is every write, any call to a vendor, Redis, email, NextAuth or `fetch`, another feature's data, a read that must share a transaction with a write, a decision that needs two sources.
6. Anything that reads the request (session, headers, cookies, searchParams) or is `"use server"`: an entry point (`actions/<noun>.ts`, `route.ts`, a page, `auth/nextauth/session.ts`). It passes `userId`, `ip` and `origin` as plain values into one call.
7. A vendor client with no feature knowledge: `lib/<vendor>.ts`.
8. Used only inside this feature: `_internal/<same role>/`, and a new file starts there. Needed by two features: move it down to the lowest rank both can import.

### Operations

| Operation | Where it goes |
| --------- | ------------- |
| Page read: list or detail | `queries.ts`, `getX(userId)`, called by the server component; wrap in `cache()` when sections share it |
| Filtered, paginated or searched read | `queries.ts`; the `searchParams` parser in `schemas.ts`; page math in `domain/`; cross-feature search in `search/queries.ts`, composed from the owners' queries |
| Read fired from the client (typeahead) | `app/api/<feature>/route.ts` GET that calls the query |
| Create, update or delete one entity | `actions/<noun>.ts` parses with `schemas.ts` and calls `services/<topic>.ts`, which writes with the owner in the `where` and checks the limit; the action revalidates |
| Several steps or side effects | `services/<topic>.ts`; the entry point calls exactly one function |
| Pure rule, limit, permission | `domain/` (the plan lookup that feeds it is a query or a service) |
| Free or Pro gate | `billing/domain/limits.ts` plus `billing/queries.ts` `getEntitlements`; the caller counts its own rows and passes the count |
| Import | `import-export/services/import.ts`; parsing is pure in `domain/`; writes go through the owners' services, never straight to Prisma |
| Export JSON or ZIP | `import-export/services/export.ts` composes export queries exposed by the owners (`items/queries.ts`, `collections/queries.ts`); `app/api/export/route.ts` only sets the headers |
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
| Page that composes features (settings, favorites) | the page in `app/(app)/<route>/` composes `*Section` components exported by the features; when a section needs data from two features, an `_components/*Panel` of the page fetches it and passes props |
| Background or long job | see "Background work" |
| Public API | see "Public API" |

### Background work

- `after()` runs after the response inside the same function invocation, bounded by the platform's maximum duration, with no retry. Use it only for work that may be lost: analytics, best-effort audit lines
- Work that must not be lost and cannot run inside the request (a sync that has to land): write the intent to the database first, then process it from a cron route or a queue with retries. The job takes ids only and is idempotent. File deletion does not need this yet: it runs inside the request, R2 first and the row second, and fails as a whole ([ADR 0004](adr/0004-direct-upload-to-r2.md))
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
- A new file starts in `_internal/`. Promote it to the public folder of the same role when a second consumer needs it, and `app/` counts as a consumer: `ItemList` and `ItemDrawer` are public from day one because pages import them. Typical private files: helpers, token and password helpers, error classes, messages, email templates, sub-components, actions used by one component. Mirror the feature anatomy inside (`_internal/components/`, `_internal/actions/`, `_internal/services/`, `_internal/emails/`)
- Inside a feature, import siblings by relative path or full alias path; never create an `index.ts` to re-export them

### Domain core

Each feature keeps its business rules in `features/[feature]/domain/` as pure TypeScript. Examples: Free-tier limits, Pro gating, token expiry and cooldown rules, ranking and mapping logic.

- Domain files take plain values and return plain values: no I/O, no `Date.now()` or randomness (pass `now` in), no environment variables
- Domain files import no package at all (React, Next.js, `next-auth`, `zod`, `node:*`, Prisma, SDKs): the lint rule is an allowlist, so a new package is refused without being named
- Domain files may import only other `domain/` files, `types.ts` files and `@/lib/utils` of the same or a lower layer
- `queries.ts`, `services/` and `actions/` are the adapters: they read and write the database, call the pure domain functions and return the result
- Create `domain/` only when a feature has a rule to put in it; new business rules (limits, gating, validation) start here, not in a component or a query

### What the lint enforces

`eslint.config.mjs` builds its zones from one rank table (`FEATURE_RANKS`) and checks:

- the layer order and the `_internal/` boundary (`import/no-restricted-paths`)
- the direction of the roles inside a feature: queries and schemas do not import services, actions or components; services do not import actions or components; actions do not import components; components do not import services
- the domain core: no package import (colocated `*.test.ts` files are excepted), only `domain/`, `types.ts` and `lib/utils`
- no Prisma in actions, components and `app/`; no `next/headers`, `next/cache` or `next/navigation` in services; vendor SDKs only in `lib`
- import cycles (`import/no-cycle`)
- deprecated APIs of the installed packages (`@typescript-eslint/no-deprecated`, with type information from `projectService`)

Not checked by lint, so it is on the author and the reviewer: no writes in `queries.ts`, one call into a service per entry point, `userId` in every `where`, a service taking `userId`, `ip` and `origin` as parameters, idempotent background jobs, and reads of another feature's models (see "Known risks").

### Known risks

- **ESLint 10.** The rules above rest on `eslint-plugin-import`, whose peer range ends at ESLint 9 (version 2.32.0, the latest on npm when this was written); it comes in through `eslint-config-next`. Stay on ESLint 9 until the plugin supports 10. `eslint-plugin-boundaries` declares `eslint >=6`, but it was not evaluated against these rules, and it was not checked whether it can replace `import/no-cycle`. `FEATURE_RANKS` is plain data, so a change of plugin replaces only the code that generates the zones
- **Teams.** Every query takes `userId`. Moving to a workspace or an `Actor` parameter touches every query and the schema; decide before the first shared collection
- **Linear ranks.** One number per feature is easy to read but brittle; past about twelve features an explicit list of allowed dependencies per feature may fit better
- **The services threshold.** Almost every write goes through a service, so some will be a few lines. That is the price of one rule with no exceptions
- **Reads of another feature's models.** The rulebook forbids `prisma.<foreign model>` in a `queries.ts`, but lint does not check it yet. The planned rule is a per-feature `no-restricted-syntax` selector generated from a model-to-owner map; it must also match transaction clients (`tx.item`). The one known deviation today: `collections/queries.ts` calls `prisma.itemType` directly and should use an `item-types` query
- **Revalidation.** No Server Action revalidates anything yet. Sidebar counts are read in the `force-dynamic` `(app)/layout.tsx`, so revalidating only the narrowest path may not refresh them. Settle the policy against the Next.js 16 docs before the first item action
- **Ownership is only reviewed.** `userId` in every `where` is checked by the reviewer, and tests with a mocked Prisma cannot prove it. The first service tests should run against a real database

## Glossary

- **Feature**: a folder in `src/features/` that owns one part of the product.
- **Rank**: the position of a feature in the one-way dependency order.
- **Entry point**: the code that receives a request: a page, a Server Action or a route handler. It reads the session, headers and form data, then makes one call.
- **Domain**: pure functions and constants. Plain values in, plain values out, nothing else.
- **Query**: a read of the feature's own database tables.
- **Service**: an operation: every write, and anything that talks to email, Redis, a vendor or another feature.
- **Server Action**: a function marked `"use server"` that a form or a client component calls.
- **Route handler**: a `route.ts` file that answers an HTTP request; used for webhooks, streaming and the public API.
- **`_internal/`**: the private part of a feature, enforced by lint.
- **`server-only`**: an import that makes the build fail if client code ever imports the file.
- **Proxy**: `src/proxy.ts`, which redirects signed-out visitors away from protected routes.
