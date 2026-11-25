# Current Feature: Placeholders and skeletons that match what they stand for

Spec: `context/features/27.placeholder-audit.md`

## Status

In Progress

## Goals

- Every `loading.tsx` of `app/(app)/` and every `<Suspense>` fallback is measured against the page that replaces it, with the server's answer held back, on a desktop and a phone and in both themes: the height and the place of each block match
- The layout shift of each such navigation, read from `PerformanceObserver` (`layout-shift`) in the e2e test, is zero or a named exception
- The pricing cards (`PlanAction`) and the mobile menu's placeholder for "Sign In" (`MobileNavPanel`) join `e2e/placeholders.spec.ts`, or the rule records why a bar is the right look for a text link
- A helper in `e2e/support/` for "hold the answer, measure, release, measure", named by the coding standard, so a new placeholder gets its line with one call
- What the measurements find is fixed in this feature

## Notes

- Non-goals: new skeleton designs, a change of what a page loads, streaming more of a page
- The open question of the plan: how a server answer is held back in the e2e build without a test-only path in production code
- The locators that find an `aria-hidden` placeholder (no role) move from `e2e/placeholders.spec.ts` into the helper ("End-to-end tests" in `context/coding-standards.md`)
- The screenshots wait for the answer, so a changed skeleton changes no baseline; a changed real component (the padding of a button, the tag filter on a phone) could
- Found work: the phone's tag filter wrapped to a second line (a missing pixel), and a hidden native input of Radix gave the editor preferences a margin until hydration
- Added on the way, at the user's request: the homepage's buttons show a spinner while their page is on its way (`PendingLinkLabel`)

## Model

- Plan: opus (the spec's own line: how an answer is held back in the e2e build; the table's row would be Sonnet or Opus)
- Implementation: sonnet (no new module, migration, auth, billing or data flow)
- architecture-reviewer: opus

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
