# Current Feature: Storybook and accessibility

## Status

In Progress

## Goals

### Storybook setup

- Storybook 10 with the `@storybook/nextjs-vite` framework (needed for the Vitest addon on Next.js); versions pinned and checked against the installed Next 16.4.5 and React 19.3.1
- Before installing, confirm that the peer range of `@storybook/addon-vitest` covers the installed `vitest@^5.1.0`; if it does not, stop and report, never downgrade Vitest
- Global decorators: dark theme (the app default), the next-intl provider, Tailwind styles from `globals.css`

### Stories (kept small on purpose)

- `components/ui`: button, badge, input, dropdown menu, sheet, with variants as controls
- About six product components: `ItemCard`/`ItemRow`, `CollectionCard`, `PaletteResults` (loading, error, results, empty), `EditorFallback`, `PricingCard`, one form field
- Server Actions and `next/navigation` are mocked through module mocks; stories target client and presentational components only (async Server Components cannot be stories)

### Tests from stories and accessibility

- `@storybook/addon-vitest` runs the stories as tests (Vitest Browser Mode) as a third Vitest project `storybook` next to `unit` and `dom`; it shares the Playwright browser install with the E2E CI job
- `play` functions for 2–3 interactions (open a menu, select, submit)
- `@storybook/addon-a11y` with violations failing the run (`a11y: { test: "error" }`); fix what it finds
- CI builds Storybook and runs the story tests in the existing workflow

### Acceptance

- `npm run storybook` and `npm run build-storybook` work
- Story tests and a11y checks run in CI and are green
- Every listed component has its main states as stories

## Notes

- Spec: `context/features/14.storybook-and-a11y.md` (moved from `plan/` by `/feature load`). Read first: Storybook for Next.js with Vite <https://storybook.js.org/docs/get-started/frameworks/nextjs-vite>, the Vitest addon <https://storybook.js.org/docs/writing-tests/integrations/vitest-addon>, accessibility testing <https://storybook.js.org/docs/writing-tests/accessibility-testing>, WCAG 2.1 <https://www.w3.org/TR/WCAG21/>
- Non-goals (decided in the review of this spec, 2026-11-14): stories for every component, publishing Storybook (Chromatic or a static deploy), visual regression (feature 21 does it with Playwright screenshots of pages), a design-system package. They stay out until there is a second reader or consumer; a rule "a component with states that are hard to reach in the app gets a story" goes into `coding-standards.md` instead of a coverage target
- Nothing of Storybook exists yet: no mention in `eslint.config.mjs`, `tsconfig.json`, `.gitignore` or the Vitest configs. Stories are not exempt from `i18next/no-literal-string` or the size limits today, so the lint scope changes in the same change, with its line in "What the lint enforces" in `architecture-rules.md`
- Installed: `next` 16.4.5, `react` 19.3.1, `vitest` ^5.1.0, `@playwright/test` 1.65.0, `@vitejs/plugin-react` 6.3.0. The `dom` project runs through the React Compiler (`reactCompilerPreset()`): decide in the plan whether the `storybook` project does too, so a story sees the same memoized code that ships
- CI: `.github/workflows/ci.yml` is the only workflow. A new job becomes a required check on `main` once it has run green on the PR, and the docs that list the checks change in the same commit; a step inside the existing `ci` job needs no new required check. Playwright browsers are shared with the E2E job
- Prerequisites: feature 3 (RTL) is done; feature 11 (i18n) is done in the code (next-intl, `en/` and `de/` messages), although its row in `context/features/plan/README.md` is still unticked
- UI/UX rules that apply: "Keyboard and focus" (the a11y gate and the `play` functions), "No layout shift" (loading states mirror the content)
- Docs to update: `context/coding-standards.md` (when a component gets a story), `README.md` (scripts), `CLAUDE.md` (commands), `architecture-rules.md` (lint scope); handbook modules 20 (styling and the component catalogue) and 21 (Testing II)

## Model

- Plan: opus (row "A new module or rank, a Prisma migration, auth, billing, a different data flow, a change to a lint rule": the lint scope changes for the stories, and a third Vitest project and the CI job are added; no migration and no new module)
- Implementation: opus (same row)
- architecture-reviewer: opus (same row)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
