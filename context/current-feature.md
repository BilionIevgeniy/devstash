# Current Feature: Architecture Guide, Auth Layout and Thin Actions

## Status

In Progress

## Goals

- Add `docs/architecture.md`, a guide for a developer new to the codebase: the map of `src/`, how a request flows, the `features/auth` tree explained file by file, why `_internal/` mirrors the role folders, a "where does X go" cheat sheet, a checklist for adding a feature and a glossary; link it from `README.md`, from `CLAUDE.md` (as a pointer, not an auto-loaded import) and from `context/coding-standards.md`, which stays the single source of the rules
- Group the NextAuth files of `features/auth` into `features/auth/nextauth/` (`auth.ts`, `auth.config.ts`, `next-auth.d.ts`, `session.ts`) so the feature root keeps only `queries.ts`, `schemas.ts` and `types.ts`, and rename `actions/auth.ts` to `actions/sign-in.ts` so two files no longer share the name `auth.ts`; update every import and the paths named in `context/coding-standards.md`
- Thin the auth actions so each one parses, reads the request and makes one call: the sequences of `confirmEmail`, `resendVerificationEmail`, `requestPasswordReset`, `changePassword` and `deleteAccount` move into the services (`confirmEmailAddress`, `resendVerificationLink` in `email-verification`, `requestPasswordResetLink` in `password-reset`, the per-user password-check limit inside `changeUserPassword` and `deleteUserAccount`), with the same steps in the same order and the same messages
- `tsc`, `npm run lint` and `npm run build` pass; no behaviour, route, schema or migration change

## Notes

- Decided in the discussion after the architecture standard: the structure was hard to read because the root of `auth` mixed seven files of different roles, two folders were called `actions` (public and `_internal`) and nothing explained the layout to a human
- Not in this change: dropping the mirrored `_internal/{actions,components,services}` folders (it would give up lint-enforced privacy for about eight files; revisit only if the tree still feels heavy)
- Per-account limits (per user, per address) now live in the services, as the standard says; the plain per-IP limits stay at the entry points (registration, sign-in), and the email-send check keeps its IP part inside `checkEmailSend`, which receives `ip` as a parameter
- The guide is written in English like the other project documents
- Commits are planned in three parts on request: the layout change, the thinner actions, the documents
- Unrelated pending changes in `.claude/` and `context/research/` stay out of the commits

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
