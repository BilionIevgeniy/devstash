# Current Feature: Final review pass

Spec: context/features/25.final-review-pass.md

## Status

In Progress

## Goals

- Every screen in the spec's list is checked at 375, 768 and 1280px, in the dark and the light theme, signed in and signed out; every finding is fixed, or goes to `todo-before-live.md` when it needs a release or a professional
- The mutation check: one rule at a time is broken in the source, the matching test goes red, the break is reverted. A rule whose break stays green gets its test. The breaks and the result are in the PR
- `/cleanup` and the `code-reviewer` over all of `src/`, their findings fixed
- The screenshots see a changed colour: a lower `threshold`, baselines taken anew from the e2e job and looked at, no flicker under `--repeat-each`

## Notes

Stages, each with its own commits; agreed with `architecture-reviewer` on 2026-11-25 (one round, all findings taken):

1. **Colour threshold** (0.02, not 0.05: the review measured that 0.05 misses a card that loses its background). All six baselines taken anew. No push until the e2e job is green and two re-runs on the same commit are too
2. **Mutation check**, a throwaway script on copies of the repo outside it: every source file with a colocated test, every `domain/` file and `schemas.ts`, `lib`, the guards in `scripts/`. Controls first (a no-op mutant survives, the breaks of the spec go red); a red run counts only when it repeats; an import error is not a kill. Services by a list of rules (ownership `where`, plan gates, locks, token use-once and expiry, rate limits) against unit and integration tests. Run again over the files stages 3 and 4 changed
3. **`/cleanup`** (report mode) and one **`code-reviewer`** run over `src/`
4. **UI pass** on the production build of the e2e stand-ins, with throwaway specs (untracked, deleted before the final checks): the inventory first, with no fix, then one decision whether the fixes are a second PR. Resend is recorded by a local server and every other host is refused at the server process; Stripe's success states are seeded rows. A slow database in front of Postgres shows the skeletons. Checks on the full matrix, eyes on legible pictures. Firefox and WebKit get one smoke pass

Settled before stage 4: **the app has no light theme a user can reach** (`dark` is fixed on `<html>`, no switch, no `prefers-color-scheme`). The matrix runs in dark; one pass emulates a light system (what a user can have), and one removes `.dark` as an inventory only. A theme switch is its own functionality and becomes a numbered spec; the PR says that the acceptance line is narrowed

- The user gave the go for the whole chain on 2026-11-25 (load, plan settled with the architect, start, review, test, complete); ask only for what only the user can give
- Found on the way: `DeleteAccountDialog.test.tsx` flaked under load
- Non-goals: new features, a redesign, a mutation-testing tool in CI

## Model

- Plan: opus (guards and services under mutation, a review of all of `src/`: more than the cosmetic row of the spec; the user chose opus)
- Implementation: opus (chosen by the user)
- architecture-reviewer: opus

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
