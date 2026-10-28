# Current Feature: Architecture Standard and Auth Cleanup

## Status

In Progress

## Goals

- Rewrite `context/coding-standards.md` around the agreed architecture: roles inside a feature (`domain`, `schemas`, `types`, `queries`, `services`, `actions`, `components`, `emails`, `_internal`), the 8-line "which file" rule, the operation table, the rank table, background-work rules and a "Known risks" section; `mutations.ts` is removed from the standard
- Bring `features/auth` in line with it:
  - `session.ts` moves back to the feature root (it reads request context, so `services/` has no exceptions)
  - `isVerificationTokenValid` and `isPasswordResetTokenValid` move to `queries.ts` (explicit exception: pre-sign-in reads keyed by an email and a one-time token, not by `userId`)
  - sha256 goes to `lib/hash.ts` (already duplicated in `lib/rate-limit.ts`), token creation and hashing to `_internal/token.ts`, one `BCRYPT_ROUNDS` in `_internal/password.ts`
  - `checkEmailSend` and the IP rate-limit helpers take an `ip` string instead of reading `headers()`; entry points read the headers
  - Zod schemas move to `auth/schemas.ts` (the email schema was repeated 7 times, the 8/72 password length was hardcoded in the register route and `RegisterForm`)
  - `lib/email.ts` becomes a generic `sendEmail`; the email copy and HTML move to `auth/_internal/emails/`
  - `OperationResult` and `ActionResult<T>` in `lib/action-result.ts` replace the hand-written result interfaces
  - the two auth actions that called Prisma use `queries.ts` and `services/account.ts` instead
  - `demo-user.ts` moves from `src/lib/db/` to `prisma/` next to the seed
- ESLint: layer, `_internal` and intra-feature zones generated from one rank table (a guard fails when a `src/features/*` folder is missing from it); `domain/` gets an allowlist of imports (no `zod`, no `node:*`, no vendor SDKs); no Prisma in actions, components and `app/`; no `next/headers`, `next/cache` or `next/navigation` in `services/` and `queries.ts`; vendor SDKs only in `lib/`; each new rule is proven by a deliberate violation
- Check every file in `.claude/` and `context/` for contradictions with the new architecture
- `tsc`, `npm run lint` and `npm run build` pass; no behaviour, route, schema or migration change

## Notes

- Decided by two independent architect reviews plus a third round on the rank table; the points that were raised afterwards (`hashToken` cannot live in `domain/` because `node:*` is banned there, `zod` was not actually banned, token reads have no `userId`, `after()` is not durable, `eslint-plugin-import` stops at ESLint 9) are all in the standard
- Rank table (reserved ranks for planned features, lint rows only for existing folders): 0 lib and components/ui, 1 auth, 2 teams, 3 billing, api-keys, audit, 4 item-types, tags, files, 5 ai, 6 items, 7 collections, 8 search, import-export, sharing, 9 account, 10 app-shell, 11 app; today's lint table: auth 1, item-types 4, items 6, collections 7, app-shell 10
- The existing auth actions still hold some sequencing (rate limit, validity check, password check); they are not thinned into services in this change, only freed of direct Prisma calls
- `featuresDRAFT/` is gitignored and holds planned specs with old paths (`lib/db/items.ts`, `src/lib/usage.ts`, `app/api/upload`); it is not edited here
- Unrelated pending changes in `.claude/` and `context/research/` stay out of the commits
- Commit, merge and push only on explicit permission; a push to `main` deploys to production

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
