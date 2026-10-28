# Architecture guide

How DevStash is organized, where each kind of code lives, and what to create when you add something. This guide explains and shows by example. The rules behind it are in [context/coding-standards.md](../context/coding-standards.md), and where the two disagree the standard wins.

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
    (app)/        authenticated pages (dashboard, profile) under one shared layout
    api/          route handlers: NextAuth, registration, later webhooks and streaming
  features/       the product, one folder per feature
    auth/         sign-in, registration, email verification, password reset, account
    item-types/   item type icons, info and queries
    items/        item rows and queries
    collections/  collection cards and queries
    app-shell/    dashboard shell, top bar, sidebar
  components/ui/  shadcn/ui primitives only
  lib/            feature-neutral infrastructure and vendor clients (prisma, email, rate-limit, hash, ...)
  proxy.ts        guards /dashboard and /profile; must stay at the src root
prisma/           schema, migrations, seed
scripts/          one-off database scripts
context/          the rulebook (coding-standards.md), the current feature and the history
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

The folder names are the same because the role is the same; the difference is only who may import it. When another feature needs something from `_internal/`, move the file to the public folder of the same role.

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

The full table with every operation (uploads, AI, Stripe, imports, background jobs) is "Operations" in [context/coding-standards.md](../context/coding-standards.md), next to the eight-line rule "Which file does a new function go in".

## Adding a new feature

1. **Pick the rank.** The table "Layers and ranks" in the standard lists the existing and the reserved features. A feature imports only lower ranks.
2. **Create `src/features/<name>/`** with only what you need. Start with `components/`, `queries.ts` and `types.ts`; add `schemas.ts`, `services/`, `actions/` and `domain/` when the first thing that belongs there appears.
3. **Add the feature to `FEATURE_RANKS`** in `eslint.config.mjs`. The lint fails until the folder and the table agree.
4. **Add the pages** under `src/app/(app)/<route>/` and widen the `matcher` in `src/proxy.ts` so the route is protected. Pages only compose.
5. **Change the database** in `prisma/schema.prisma` and run `npx prisma migrate dev --name <what>` (never `db push`); update `prisma/seed.ts` if the demo data needs it.
6. **Write the code by role:** reads in `queries.ts` (scoped by `userId`), writes in `services/`, inputs in `schemas.ts`, rules in `domain/`, the form handler in `actions/`.
7. **Check:** `npx tsc --noEmit`, `npm run lint` and `npm run build`. The build also runs `prisma migrate deploy`, which applies pending migrations to the database named in `.env`.
8. **Record it** in `context/feature-history.md` when the feature is done (see `context/ai-interaction.md` for the workflow).

Adding an operation to an existing feature is the same without steps 1 to 5: input schema, then the service, then the action, then the component that calls it.

## What protects the structure

`npm run lint` fails when:

- a feature imports a feature of the same or a higher rank, or `app/`;
- code outside a feature imports its `_internal/`;
- a role imports a role above it (a service importing an action, a component importing a service);
- a `domain/` file imports any package;
- an action, a component or a page imports Prisma;
- a service imports `next/headers`, `next/cache` or `next/navigation`;
- an SDK of a vendor (Resend, Upstash, Stripe, OpenAI, AWS) is imported outside `lib/`;
- two files import each other in a loop.

What lint cannot see (no writes in `queries.ts`, one call into a service per entry point, `userId` in every query) is on the author and the reviewer. The exact list is "What the lint enforces" in the standard.

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
