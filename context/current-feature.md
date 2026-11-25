# Current Feature: A theme the user can choose

Spec: context/features/26.light-theme.md

## Status

In Progress

## Goals

- The user chooses system, light or dark; system follows `prefers-color-scheme`, also when it changes while a page is open
- The first paint has the right theme on every page, static ones included, with no flash, and no static page becomes dynamic
- A control in the settings, in the user menu and on the marketing pages
- Every item of the spec's inventory is fixed in light: the homepage, cards and rows, the item page and drawer, `/upgrade`, the destructive button
- What axe did not see follows the theme too: `color-scheme` and the toasts. The editor's window dots stay (decorative, hidden from assistive technology) and Monaco's themes stay dark, a choice of their own
- The screenshots and the accessibility scan run in both themes, and Storybook's toolbar switches the theme
- English and German for every new text; the decision in an ADR, and the "Dark mode only" rule in `coding-standards.md` replaced

## Notes

- Today: `globals.css` holds both themes, `dark` is fixed on `<html>` (`app/layout.tsx`, `app/global-error.tsx`), the toasts are `theme="dark"`, nothing reads `prefers-color-scheme`
- Open for the plan: where the choice is kept (a cookie the server can read for the app, storage for the static pages) and how it reaches the first paint, under ADR 0024 (the root reads nothing from the request), ADR 0037 (`ensureStatic`) and ADR 0036 (inline scripts are allowed). A stored choice also concerns consent (ADR 0034) and the privacy notice
- The inventory (2026-11-25, axe color-contrast at 375 and 1280) is in the spec
- `global-error.tsx` and the Open Graph image: the first takes the theme, the second stays as it is
- The dark baselines of `e2e/visual.spec.ts` must not change by theme; `settings` changes by content (the new Appearance section). The light ones come from the e2e job's artifact
- Non-goals: a third theme, a change of the dark theme

## Model

- Plan: opus (where the choice lives and how it reaches a static page; second row: work inside existing modules, no migration)
- Implementation: sonnet (same row)
- architecture-reviewer: opus

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
