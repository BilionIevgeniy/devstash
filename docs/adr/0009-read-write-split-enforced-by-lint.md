# 0009. The split between reads and writes is enforced by lint

- Status: accepted
- Date: 2026-11-04

## Context

Reads belong in `queries.ts` and writes in `services/`, but only the author and the reviewer checked that ([ADR 0002](0002-boundaries-enforced-by-eslint.md) lists "no writes in `queries.ts`" as beyond lint). The code drifted: `items/services/item.ts`, `auth/services/account.ts` and `auth/nextauth/auth.ts` read Prisma directly with no transaction around the read. [ADR 0003](0003-services-for-every-write.md) says lint cannot tell a harmless read from a write; that holds for import rules, not for a selector on the Prisma call.

Some of these reads return a secret: a password hash, a GitHub access token. A function in `queries.ts` is public, so a server component of any higher feature could import it.

## Options

1. **Keep the review.** No work, and the drift goes on.
2. **Lint, with the secret reads left in services** behind an `eslint-disable` each. The secret never leaves one function, but the rule keeps a permanent way out and every new secret read adds another one.
3. **Lint with no exceptions, and the secret reads in `_internal/queries.ts`.** The `_internal/` boundary is already enforced, so nothing outside the feature can import them.

## Decision

Option 3. `no-restricted-syntax` in `eslint.config.mjs` forbids:

- in `services/` and `nextauth/`: a read through `prisma.<model>` and `prisma.$queryRaw`. A read through `tx` stays allowed, since it shares a transaction with a write
- in `queries.ts` (public and `_internal/`): a write through `prisma` or `tx`, `prisma.$transaction`, `prisma.$executeRaw` and `prisma.$queryRaw`

A read that hands a secret to its caller goes in `_internal/queries.ts`. A read that reduces the secret to a boolean (`getUserProfile`, `getAccountState`) is an ordinary query.

This replaces the "no writes in `queries.ts`" item of ADR 0002 and the argument about lint in ADR 0003.

## Consequences

- The split no longer depends on the reviewer, and there is no `eslint-disable` for it in the code
- A password hash crosses a function boundary inside `auth`, where before it stayed in one function
- `getPasswordHashByEmail` and `getCredentialsUser` are keyed by email with no one-time token: the caller holds no user id yet, and the password being checked is the authorization. The exception to scoping by `userId` covers them
- `auth/nextauth/auth.ts` still imports `prisma`, for `PrismaAdapter(prisma)` only
- The selectors match the names `prisma` and `tx`, not the meaning of a call. Left to the reviewer: an alias (`const { item } = prisma`), and a read through `tx` in a transaction with no write
