---
name: cleanup
description: Clean up project housekeeping tasks and check the architecture rules (add "run" to execute fixes)
argument-hint: run|check
---

Review the codebase for cleanup tasks. Start with `git status` and `npm run lint`: several checks below read the lint output. Name the files with uncommitted changes in the report, since a finding there may be work in progress.

1. **History order:** `context/feature-history.md` goes from oldest to newest. The entries have no dates, so compare them with the merge order in `git log main`
2. **Debug logs:** find `console.log`, `console.debug` and `console.info` in `src/`. `console.error` in a `catch` is the project's logging: leave it
3. **Unused imports and variables:** read the `no-unused-vars` warnings in the lint output
4. **Stale comments:** find `TODO`, `FIXME` and `HACK` comments in `src/` whose work is done or no longer planned. Work deferred on purpose belongs in `context/todo.md`
5. **Orphaned files:** find files in `src/` that nothing imports. Skip what is used without an import: Next.js files (`page`, `layout`, `loading`, `error`, `global-error`, `not-found`, `route`, `default`), `src/proxy.ts`, `components/ui`, `src/generated` and tests
6. **Context files:** check them against the project:
   - `context/current-feature.md`: its status and goals match the current branch and the code
   - `context/project-overview.md`: the Status section is still true
   - `context/architecture-rules.md`: the rank table matches `FEATURE_RANKS` in `eslint.config.mjs` (a planned feature has a row but no entry there)
   - `docs/modules.md`: every folder in `src/features` has a section
   - Skip `context/features/` and `featuresDRAFT/`: specs keep the paths of the old layout on purpose
7. **Suppressions:** find `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck` and `eslint-disable` comments that are no longer needed
8. **Architecture:** read the lint errors, then search for what the lint does not cover. Only checks a search can answer belong here: logic (`userId` in every `where`, one service call per entry point, reads through `tx`) is for the `code-reviewer` agent
   - Foreign models: a feature uses `prisma.<model>` or `tx.<model>` for a model it does not own in the rank table
   - `import "server-only"` missing from a `queries.ts` or a file in `services/`, `import "client-only"` missing from a browser helper, `"use client"` on a hook or a helper
   - An `index.ts` barrel in `src/`
   - An authenticated route in `app/(app)/` that the matcher in `src/proxy.ts` does not cover

## Report

One line per check, then the findings numbered across all checks, each with its file and line:

- 🟢 clean
- 🟡 needs a decision (it may be intended)
- 🔴 should be fixed

**Mode: $ARGUMENTS**

If there is no argument, the argument is "check", or it is anything else:

- Only report findings, don't modify anything
- List what WOULD be cleaned up

If the argument is "run" or "fix":

- First, report all findings with numbered items
- Then ask: "Which items would you like me to fix? (enter numbers like 1,3,5 or 'all' or 'none')"
- Wait for user response before making any changes
- Only fix the items the user specifies
- Before fixing, follow the branch rule in `context/ai-interaction.md`: on `main`, create a `fix/` branch; with unrelated uncommitted work, ask first
- An architecture finding that needs more than a local edit gets its own plan: don't fix it inside the cleanup. If the rule itself should change, that needs a record in `docs/adr/`
- Confirm each file deletion by name, even with 'all'
- After the fixes, run `npm run typecheck`, `npm run lint`, `npm run test` and `npm run build`, and report the results. A failure is fixed or reported, never skipped
- Do not commit: ask first
- Report what you changed
