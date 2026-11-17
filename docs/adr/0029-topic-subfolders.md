# 0029. A large folder is split into topic subfolders

- Status: accepted
- Date: 2026-11-17

## Context

Code is grouped by feature and, inside a feature, by role (ADR 0001, the role table of `context/architecture-rules.md`). Nothing said what happens when one role folder grows. By feature 16 some had 16 to 39 files besides their tests: `src/lib` (29), `items/_internal/components` (39), `app/(marketing)/_components` (27), `items/components` (19), `items/domain` (16), `components/common` (16). A reader had to scan a flat list to find the result contract, the drawer or the chaos animation. ADR 0017 already split `queries.ts` by topic for the same reason.

## Options

1. **Leave folders flat.** Imports stay as they are; the lists keep growing.
2. **Split by topic, past a fixed size, without barrels.** A folder with more than 12 files (not counting tests and stories) gets subfolders named by what they hold; the files keep their names, their role and their lint; imports name the full path (ADR 0015).
3. **Split by kind** (`skeletons/`, `dialogs/`, `buttons/`). Easy to sort, but the parts of one topic (the drawer and its skeleton) end up apart.

## Decision

Option 2. The threshold is exact so it can be checked: more than 12 files directly in the folder, not counting `*.test.*`, `*.stories.*` and subfolders. `/cleanup` reports a folder past it. `components/ui` (shadcn writes there) and `i18n/messages/<locale>` (one file per namespace) are exempt. The role of a file does not change with its folder: a subfolder of `components/` is still `components/`, of `domain/` still `domain/`, and `components/hooks/` stays where the lint expects it.

`src/lib` is split into `errors/`, `http/`, `observability/`, `postgres/`, `vendors/` and `locale/`. The Prisma folder is `postgres/`, not `db/`: the course specs name `src/lib/db/*.ts` for the reads and writes of items and collections, which belong in the features ("Old paths in specs"), and a real `lib/db/` would make that path look right.

## Consequences

- A move is a commit of its own: `git mv` with the colocated tests, the imports, the `vi.mock` and `sb.mock` paths, and the exact paths in `eslint.config.mjs` and `vitest.shared.mts`. Lint and typecheck do not see a stale string path (an exact-name import ban, a mock of a path that no longer exists), so each move ends with a search for the old paths and one deliberate violation per moved lint path.
- ADRs and done specs keep the paths of their time; the living docs, the plan specs and the agents' instructions change with the move.
