# 0026. Storybook for the hard-to-reach states, with every story run as a test

- Status: accepted
- Date: 2026-11-14

## Context

Some states of a component show only with the right data or the right failure: a palette that is loading, failed or empty, an editor whose Monaco chunk did not load, a collection whose star was refused. Seeing them meant clicking through the app with that data. Accessibility was checked by hand only; the target is WCAG 2.1 AA.

The component tests (`dom`, jsdom) prove behaviour, but jsdom has no layout and no styles, so it cannot check colour contrast or what a portal looks like.

## Decision

**Storybook 10 with `@storybook/nextjs-vite`, and every story is a test.** `@storybook/addon-vitest` turns the stories into the third Vitest project, `storybook` (vitest.config.mts), which runs in Chromium (Vitest Browser Mode, `@vitest/browser-playwright`). It is part of `npm run test`, so it runs before every commit and in the `ci` job, which installs the Chromium of the e2e tests first; `npm run build-storybook` runs there too. No new CI job and no new required check.

- **An axe violation fails the story's test** (`parameters.a11y.test: "error"` in `.storybook/preview.tsx`). A known violation whose fix would change what the user sees is turned off rule by rule in that story, with the reason in a comment and the fix in the Scope of the matching spec in `context/features/plan/`; never with `test: "todo"` or `"off"` for the whole story
- **A component gets a story when its states are hard to reach in the app**, not to cover every component. Stories show client and presentational components (an async Server Component cannot be a story). When the state comes from a hook that fetches, the story shows the component that takes that state as props (`PaletteBody`, not `PaletteResults`)
- **Stories sit next to their component** as `[Name].stories.tsx`, in its module and role folder; `components/ui` holds its primitives and their stories. Demo data shared by two stories goes in an `_internal/components/*-story-data.ts` file of the module
- **A module with server imports is replaced by a mock file, never automocked.** Storybook's automock still evaluates the original module and its imports, and a Server Action reaches the session, the services and Prisma. The mock file sits next to the module in `__mocks__/`, imports only its types, and exports each function as `fn()` resolving with `ok()`; `.storybook/preview.tsx` registers it with `sb.mock("…/module.ts")` (a string with the extension: Storybook resolves it with `require.resolve`). A story sets another answer with `mocked(fn).mockResolvedValue(…)` in `beforeEach`. `next/navigation` comes from the framework's own mock (`nextjs.appDirectory: true`)
- **The context of the app**: the theme and the fonts go on `<html>`, as in the root layout, so a portal (menu, sheet, toast) is dark and axe measures the colours the app shows; the toolbar's locale sets `lang` on `<html>`. The decorator renders `AppProviders` (`test/app-providers.tsx`, shared with the `dom` test wrapper) with one Query client per story mount, and the `Toaster`. `QueryProvider` is not used: its devtools button would join every axe scan
- **The React Compiler**: the framework does not apply `reactCompiler` of next.config.ts, so `.storybook/main.ts` adds the same Babel pass as the `dom` project, stories excluded. The framework swaps `react` for the copy Next ships but names no `react/compiler-runtime`, so main.ts aliases that path to the same copy. `src/lib/react-compiler.stories.tsx` fails when either stops working
- **One resolve config**: the `storybook` project does not extend the root config (no `sharedResolve`, no empty `server-only` stub), so a story resolves its modules in the test as in `npm run storybook`. A story whose chain reaches `server-only` fails in both, and gets a mock file
- **The lint**: stories are exempt from `i18next/no-literal-string` and the size limits, like the tests (their text and data are demo content); every other rule applies, including `no-floating-promises` for the `play` steps. `.storybook/` is in `tsconfig.json` and under `no-floating-promises`. The cache guard (`item-queries.guard.test.ts`) skips stories: a story imports an action to assert on its mock and calls nothing
- **Versions move together**: Storybook packages at one version, `vitest` and `@vitest/*` at one (the browser provider peers vitest exactly), `playwright` at the version of `@playwright/test` (one Chromium). All exact; Dependabot groups them before the catch-all `minor-and-patch` group. Telemetry is off (`core.disableTelemetry`, and `STORYBOOK_DISABLE_TELEMETRY` in CI)

## Consequences

- `npm run test` needs Chromium locally (`npx playwright install chromium`, the same one e2e needs) and takes a few seconds longer
- A first run after a story imports a dependency Vite has not seen yet can fail once while Vite re-bundles; a run from an empty cache (CI) scans every story first and is not affected
- Out on purpose: stories for every component, publishing Storybook, visual regression of components (feature 21 takes screenshots of pages), a design-system package. They are reconsidered when a second reader or consumer appears
- Accepted: three moderate `npm audit` findings in a dev-only build dependency of the framework (`@joshwooding/vite-plugin-react-docgen-typescript` 0.7 → `glob` 13, GHSA-3g3m-2fjr-6pw4), with no fixed version in Storybook 10.6.7 (Watch in `context/todo-before-live.md`)
