# Current Feature: Auth Services Folder

## Status

In Progress

## Goals

- Group the server-side logic of `features/auth` into `features/auth/services/` so the feature root stops mixing files of different roles: `account.ts`, `registration.ts`, `email-verification.ts`, `password-reset.ts`, `email-rate-limit.ts` and `session.ts` move there
- Move the private `_internal/github-grant.ts` to `_internal/services/github-grant.ts` (the `_internal/` folder mirrors the feature anatomy)
- Keep `queries.ts`, `types.ts`, `next-auth.d.ts`, `auth.ts` and `auth.config.ts` at the feature root (the same layout as the other features, and the NextAuth entry points)
- Update every import of the moved files, inside `features/auth` and outside it (`proxy.ts`, the `app/` pages, routes and `_components`, `features/app-shell/components/Sidebar.tsx`)
- Update `context/coding-standards.md`: the folder tree comment for `auth/`, the "Inside a feature" anatomy (add `services/`), the adapters list in "Domain core" and the server-only list in "Rules"
- Move the files with `git mv`; no file is deleted and no behaviour, route, schema or migration changes
- `tsc`, `npm run lint` and `npm run build` pass

## Notes

- `services/` was chosen over `model/services` and `model/types`: `model/` would overlap with `domain/` (the pure business rules), and `types/` would hold one or two files, while `types.ts` is the same name in every feature and the `domain` ESLint zone refers to it by name
- `services/` holds server-only modules that talk to the database, email, Redis or NextAuth; every file in it keeps `import "server-only"`
- Only `auth` changes now. The other features have 2-3 files at the root; each gets a `services/` folder when it grows a second server-logic file
- ESLint needs no change: the layer, `_internal` and `domain` zones do not depend on the new folder
- Check of `context/` and `.claude/` for references to the old layout:
  - Needs an update: `context/coding-standards.md` (the `auth/` line in the folder tree, the feature anatomy, the adapters list, the server-only list that names `session.ts` and `email-verification.ts`)
  - No change needed: `.claude/agents/auth-auditor.md` (globs `src/features/auth/**/*`), `.claude/skills/list-components/SKILL.md` (scans `src/features/**/*`), `.claude/agents/code-reviewer.md`, `.claude/skills/feature/**`, `cleanup`, `research`
  - Left as is, historical: `context/feature-history.md` (append-only), `context/features/*-spec.md` (completed specs that already point to pre-feature-architecture paths such as `src/auth.ts`, `src/types/next-auth.d.ts`, `src/lib/db/*`, `src/lib/mock-data.ts`), `context/research/*.md` (untracked, refer to a `src/lib/constants.tsx` that does not exist)
  - Noticed, not part of this change: `demo-user.ts` lives in `src/lib/db/`, while `coding-standards.md` lists `demo-user` directly under `lib/`
- The unrelated pending changes in `.claude/` and `context/research/` stay out of this feature's commit

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
