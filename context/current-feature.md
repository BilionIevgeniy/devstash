# Current Feature: Codebase hygiene

## Status

In Progress

## Goals

Spec: `context/features/16.codebase-hygiene.md`. Behaviour and UI do not change anywhere. One commit per item, in this order:

- **The style, committed**: `.prettierrc` (Prettier's defaults, what the editor uses today), `.prettierignore` (`src/generated`, `prisma/migrations`, `public/monaco`, `.next`, the lockfile; decide on Markdown), `.vscode/settings.json` (`editor.formatOnSave`, `editor.defaultFormatter: esbenp.prettier-vscode`, `prettier.requireConfig`)
- **The sweep**: `prettier --write` over everything in its own commit (whitespace and punctuation only, reviewed with `git diff -w`); its hash in `.git-blame-ignore-revs`, with a comment that it survives because PRs merge with `--merge`
- **The check**: `npm run format` and `format:check`, `format:check` in the `ci` job; the command in `CLAUDE.md` and in "Testing" of `coding-standards.md`; `prettier --write` after `npx shadcn add`; the "format only touched files" rule and the "Styling" line that points at this item change
- **The build cache in CI**: `actions/cache` for `.next/cache` in `.github/workflows/ci.yml`, in `ci` before `npm run build` and in `e2e` before Playwright builds; key on `package-lock.json` and the sources, `restore-keys` on the lockfile hash; the second run's log shows no "no build cache" warning
- **Schema without its migration fails CI**: a step in the `integration` job that compares the migrations with `schema.prisma` and exits non-zero on a difference; proved once with a deliberate schema edit, then reverted; a new ADR as addendum to ADR 0013
- **The seed**: `prisma/seed-data.ts` catches up with `20261030120000_demo_items_content` (or the seed creates only the user); the demo user stays Free with 49 items and 2 collections; the README says why the seed differs from production
- **Topic subfolders**, one commit per folder, no `index.ts`: `git mv` with the colocated tests, then imports, `vi.mock` paths, stories, the paths in `eslint.config.mjs`, the `@/lib/observability/sentry` alias in `vitest.shared.mts`; a rule in `architecture-rules.md`: "a folder past about 12 files is split by topic, without `index.ts`"
- **The copies jscpd found**, each judged by `code-reviewer` first: `PasswordFields` for `ConfirmEmailForm` and `ResetPasswordForm`; one component for `StatsCards` and `UsageStats`

Acceptance:

- `npm run format:check` passes and runs in `ci`; a file saved in the editor shows no unrelated diff
- The second CI run uses the build cache
- A schema edit without a migration fails the `integration` job
- lint, typecheck, the tests, the build, integration and e2e stay green after every commit; `git diff -w` of the sweep is empty

## Notes

- When: with no other branch open, since the sweep and the moves conflict with everything (checked at load on 2026-11-17: no open PRs, `feature/ai-output-marking` has nothing beyond `main`)
- Non-goals: ESLint 10 (Watch item in `context/todo-before-live.md`), any behaviour or UI change, renaming exports
- Tests: none new apart from the moved ones; the deliberate schema edit is the proof of item 5
- Open decisions for the plan: Markdown in or out of Prettier (it re-aligns every table; the course specs in `context/features/` may be ignored); the `prisma migrate diff` flags on the installed Prisma 7 CLI (no shadow database in `prisma.config.ts`; `--help` and the docs, not the todo's old command); copy the demo content into the seed or seed only the user; the exact subfolder grouping (the spec's idea is judged again)
- Docs to update: `CLAUDE.md` (commands), `README.md` (scripts, seeding), `context/coding-standards.md` (Testing, Styling, paths in "Shared building blocks"), `context/architecture-rules.md` (Layout, the folder rule, the lint scope), `docs/architecture.md`, `docs/modules.md`, the ADR addendum to 0013, the paths in the plan specs 17–23 and in `context/todo-before-live.md`; the memory "format only touched files" ends with item 3
- Read first: https://prettier.io/docs/configuration; `node_modules/next/dist/docs/` (CI build caching); `prisma migrate diff --help` and https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff; https://git-scm.com/docs/git-blame (`--ignore-revs-file`)

## Model

- Plan: opus (row "a change to a lint rule": the exact paths in `eslint.config.mjs` change, and a new CI check)
- Implementation: opus (same row; the spec suggests sonnet as mechanical, the table decides)
- architecture-reviewer: opus (every row)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
