# Current Feature: Reads in Queries

## Status

In Progress

## Goals

- The two plain reads in `items/services/item.ts` move to `items/queries.ts`: `getItemEditState` and `getItemFileKey`, with no change in behaviour
- Reads that hand a secret to their caller (password hash, OAuth token) move to `auth/_internal/queries.ts`; `getSessionVersion` moves to `auth/queries.ts`
- ESLint fails on a `prisma` read in a service or `nextauth/` and on a write in `queries.ts`, with no exceptions, so the split no longer depends on the reviewer

## Notes

- Reads through `tx` inside a `$transaction` stay in services: the rule already allows a read that shares a transaction with a write
- The secret reads are the four in `auth/services/account.ts` and the one in `authorize` in `auth/nextauth/auth.ts`
- The rule change is recorded in `docs/adr/0009-read-write-split-enforced-by-lint.md`, with a row in `docs/adr/README.md`. ADR 0002 and 0003 stay as they are: an accepted record is not edited
- Docs: `docs/architecture.md`, `docs/modules.md` and `context/architecture-rules.md`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
