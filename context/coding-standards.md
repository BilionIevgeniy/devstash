# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful
- No deprecated APIs: before using a library API, check it against the installed version (its `.d.ts` in `node_modules`, or Context7), not memory. `npm run lint` fails on `@deprecated` APIs

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks
- React Compiler is on (`reactCompiler` in `next.config.ts`) and memoizes components, functions and values itself: no `useMemo`, `useCallback` or `memo`. The one exception is a value whose identity must be exact (an effect dependency the compiler cannot keep stable), with a comment saying why

## Next.js

- Server components by default
- Only use `'use client'` when needed (interactivity, hooks, browser APIs)
- Use Server Actions for form submissions and simple mutations
- Use API routes when you need:
  - Webhooks (Stripe, GitHub, etc.)
  - Streaming responses (AI)
  - Reads fired from the client in parallel (typeahead, infinite scroll): Server Actions run one at a time
  - Specific HTTP status codes or headers
  - The public API for the future CLI and extensions
  - Third-party integrations
- File uploads: the browser sends the file straight to the storage (Cloudflare R2) with a presigned URL, so progress comes from the browser request. Never proxy file bytes through a Server Action or a route handler
- Otherwise, fetch data directly in server components
- List state a link should keep (sort, filter, page) lives in the URL, never in `useState`: the page parses `searchParams` with a schema that falls back to the defaults and never throws, and one function in the feature's `domain/` writes the URL (defaults left out, the page last, a sort or filter change back to page 1). When the server must answer, the control calls `router.replace` in `startTransition` with `useOptimistic` and `data-pending`, and the rows stay on screen, dimmed, in a Suspense with no `key`; when every row is already in the browser, `useSearchParam` (`history.replaceState`) and an in-memory sort. Details: "List state in the URL" in `docs/architecture.md`
- Dynamic routes for item/collection pages

## Tailwind CSS v4

**CRITICAL**: We are using Tailwind CSS v4, which uses CSS-based configuration.

- **DO NOT** create `tailwind.config.ts` or `tailwind.config.js` files (those are for v3)
- All theme configuration must be done in CSS using the `@theme` directive in `src/app/globals.css`
- Use CSS custom properties for colors, spacing, etc.
- No JavaScript-based config allowed

Example v4 configuration:

```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(50% 0.2 250);
}
```

## Architecture & File Organization

The architecture rules (layout, ranks, roles inside a feature, where new code goes) are in [architecture-rules.md](architecture-rules.md), which is loaded on its own. The guide with examples and the reference (operations, background work, public API, known risks) are in [docs/architecture.md](../docs/architecture.md).

## Naming

- Components: PascalCase (`ItemCard.tsx`)
- Files: Match component name or kebab-case
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)

## Styling

- Tailwind CSS for all styling
- Use shadcn/ui components where applicable
- A primitive added with `npx shadcn add` goes through `npm run lint`: the canonical-class rule covers `components/ui` too. Fix a hit with `npx eslint --fix <file>`, not with the editor's format on save, which rewrites the whole file (see the style item in `context/todo.md`)
- No inline styles
- Dark mode first, light mode as option

## UI/UX

Check every UI change against these before writing it; the plan names which ones apply.

- Feedback at once: a button that starts a request shows its pending state (`Creating…`, `Deleting…`) and is disabled until the result, so it cannot be sent twice
- A notification never runs ahead of the screen: a "created" toast does not show while the form is still open. Sonner sits outside React transitions, so a toast waits for the same commit or event as the UI it confirms
- Optimistic only where the rollback is cheap and the result is known in advance (hiding a deleted card). Not where the server decides the data (ids, dates, order) or where a failure would lose the user's input (creating)
- When an action changes the page itself, wait for the result before leaving, and keep the history honest: `router.replace` so Back does not lead to something deleted
- No layout shift: a skeleton mirrors the size of the content it stands for, and each route segment that loads on its own has its own `loading.tsx`
- Exit animations finish before the navigation they lead to, so nothing vanishes mid-slide
- Keyboard and focus: Esc closes, focus returns to the trigger, every dialog and sheet has a title (hidden if need be)
- Errors in plain words, and the form with the user's input stays open so they can retry

## Database

- Use Prisma ORM for all database operations
- Always use `prisma migrate dev` for schema changes (not `db push`)
- Run `prisma migrate status` before committing to verify migrations are in sync
- Migrations reach Vercel only through `npm run vercel-build`, which migrates the environment's own database through `scripts/migrate-if-allowed.ts` before the build; `npm run build` touches no database ([ADR 0013](../docs/adr/0013-how-schema-changes-reach-production.md))
- Every migration is backward compatible with the deployment that is live (expand/contract): a column is dropped only in a later deploy, once nothing reads it
- A migration is never edited after it has been pushed: previews have already applied it to `development`; a fix is a new migration

## Data Fetching

- Server components fetch through the feature's `queries.ts` (Prisma, scoped by userId; the one exception is in rule 4 of "Where does this go" in [architecture-rules.md](architecture-rules.md))
- Client components use Server Actions
- Validate all inputs with Zod; the schemas live in the feature's `schemas.ts`

## Error Handling

- Use try/catch in Server Actions
- Return the `ActionResult<T>` pattern `{ success, data, error }` from actions
- Display user-friendly error messages via toast

## Logging

- Everything is logged through `@/lib/logger` (`logger.info`, `logger.warn`, `logger.error`); `console.*` is a lint error in `src/` outside the logger and the tests. Each call writes one JSON line
- Log ids, status codes and the error's name or code. Never an email address, a name, an IP address or content (item text, titles, file names, prompts)
- The message is a fixed sentence written by the author of the call (`"Creating the item failed"`). It may interpolate only a constant from a closed set (an operation label, a Stripe event type), never a value that came from a user or a vendor. Ids go in the context under keys that end in `Id` (`userId`, `itemId`: the type refuses a literal key that does not end in `Id`; it cannot see a spread or a computed key, so a review looks at those), and numbers (a status, a count) under `numbers`
- Pass the caught error as `error`, never its message and never inside the message string. The logger writes its class and codes (`errorSummary`: name, code, type, status, request id, reason) and the frames of its stack (`errorFrames`, ten at most) and drops the message: the message of a Prisma, Resend, Stripe or OpenAI error can carry the arguments of the failed call
- `logger.error` also reports the failure to Sentry and returns the promise of the flush: `await` it where the function answers right after (`@typescript-eslint/no-floating-promises` checks), so the event leaves before the instance can freeze. It never rejects, so an `await` in a `catch` cannot change what that `catch` does. The same failure (message and error class) is reported once a minute per instance; every occurrence is in the log. `warn` and `info` never leave the server. See [ADR 0016](../docs/adr/0016-error-monitoring-with-sentry.md)

## Code Quality

- No commented-out code unless specified
- No unused imports or variables

## Size limits

Small units with one job each, in the spirit of Clean Code and the usual SonarQube quality gates. ESLint enforces the numbers (`max-lines-per-function`, `max-lines`, `complexity` in `eslint.config.mjs`); blank lines and comments do not count, and tests, `components/ui` and `src/generated` are exempt.

| What                                                                                                                                                                          | Limit                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| A function in `domain/`, `schemas.ts`, `queries.ts`, `services/`, `actions/`, `lib/`, `route.ts`                                                                              | 50 lines                        |
| A component (`.tsx`) or hook (`components/hooks/use-*.ts`), anything in `components/common`, a page or layout. Browser helpers in `components/` (`put-file.ts`) are logic: 50 | 80 lines (JSX is long but flat) |
| A file                                                                                                                                                                        | 250 lines                       |
| Cyclomatic complexity of a function                                                                                                                                           | 15                              |

How to split when a unit grows past its limit, or has more than one job before it gets there:

- State, refs and effects that belong together go to a hook, `components/hooks/use-<topic>.ts` (`_internal/components/hooks/` while it is private: `useFileUpload`, `useDirtyCloseGuard`). A hook has the same imports as a component, so it is part of the `components/` role; it never imports a `.tsx` (lint), and a type it shares with its component lives in the hook's file ([ADR 0007](../docs/adr/0007-client-hooks-in-the-components-role.md)). There is no `hooks/` folder beside `components/`
- A block of JSX with its own condition or its own state becomes a subcomponent (`UploadProgress`, `DropZone`). Small helpers used by one component stay private in its file
- One exported component per file. A file that collects several components that each work alone is split into one file each (`ItemDrawerHeader`, `ItemBody`, `ItemMeta`)
- A pure rule found inside a component moves to `domain/` with its test (`typeFieldValues`)
- Markup repeated in two places becomes one component, with the differences as props (`ItemFields` in the create and edit forms)
- Browser-only I/O (an XHR, a `fetch` to our API) goes to a plain function in `components/` (`put-file.ts`, `fetch-item-detail.ts`) that the hook calls. It starts with `import "client-only"`, never with `"use client"`
- A hook or component starts in the feature's `_internal/components/`; it moves to a shared place only when a second feature needs it (rule 9 in [architecture-rules.md](architecture-rules.md)). A hook with no feature knowledge goes to `src/components/common/hooks/`
- Never split just to hit the number: a part that cannot be named by what it does stays where it is

## React patterns

- A form with several fields keeps them in one state object and updates it with a function: `setValues((current) => ({ ...current, [name]: value }))`. The setter stays stable, so a subscriber like Monaco never writes from stale values
- A hook that aborts a request (unmount, reset, a new attempt) gets no callback for the abort: the code that aborts has already moved on, and a late "failed" would flash an error
- A plain form (fields the browser owns: sign-in, passwords, registration) uses `<form action>` + `useActionState`: no `onSubmit`, no `preventDefault`, no `useTransition`. The action is the Server Action itself when the page only redirects afterwards (`SignInForm`). When the answer decides something in the browser (a toast, `router.replace`, a sign-out), it is a client function around the Server Action, or around the `fetch` of a route (`RegisterForm`; the form API does not decide the transport): it reads the `FormData`, makes the call and returns `{ error, values }`. React clears an uncontrolled form after its action, so the values come back in the state and go in as `defaultValue`; they are produced in the browser and never echoed by the server, since a password must not travel back. Pending is the `isPending` that `useActionState` returns, and the error is hidden while a new attempt runs, so a repeated error is announced again. Not progressive enhancement: the success effects are client code
- A form keeps `onSubmit` + `useTransition` in two cases. Its dialog has to know that a request runs and wait for the result before it closes: the create and edit dialogs of items and collections block Esc and the overlay while it runs, and close in the commit that brings the refreshed page. Or its fields are controlled rich editors: the item forms, where Monaco and the Markdown textarea hold their text in the form's state, and a form action would clear them after it ran
- `useEffectEvent` is for what an effect only reads when something else happens (a key press, a timer, a cleanup): the latest callback or prop. The effect subscribes once and lists only what should restart it. An Effect Event is never in a dependency array and never passed on, since its identity changes on every render: a listener is an effect-local function that calls it. A callback read this way must report to the same place for as long as the component lives, because a new callback is not told the current state until the next change (`usePaletteHotkey`, `useUnsavedChanges`)
- A Server Action that redirects (a session that ended) rejects its promise in the browser, and the router navigates on its own. A `catch` around the call never shows that as a failure: inside a `useTransition` transition, `unstable_rethrow(error)` first (the dialogs); anywhere else (a standalone `startTransition`, an event handler, a toast callback, a browser helper), `if (isNavigationError(error)) return` (`lib/navigation-error.ts`) before the toast and the rollback. A bare `catch {}` around an action is a bug
- `ref` is a prop (no `forwardRef`). A component hands out a handle with `useImperativeHandle` only for what props cannot say, such as moving focus, and only the minimum (`EditorHandle`: `focus()`). The handle type lives in the owner's `types.ts`; it does nothing until the thing it moves exists (Monaco still loading) and is called from event handlers, never from render. A form moves focus to an editor, which has no native validation, through it (`rejectInvalidContent`)
- A refactor keeps behaviour as it is: a split does not lock, unlock, reorder or rename anything the user sees

## Testing

Vitest, run with `npm run test` (one run) or `npm run test:watch`. Tests are colocated with the file they test and import `describe`, `it` and `expect` from `vitest` explicitly. The file extension picks the Vitest project; `npm run test` runs `unit` and `dom`, `npm run test:integration` runs `integration`:

- `unit`: `[name].test.ts` (also under `scripts/`), node environment. Domain rules, schemas, services, routes
- `dom`: `[name].test.tsx`, jsdom, with React Testing Library. Components and hooks (`renderHook`). A hook test named `.test.ts` runs in node and fails with "document is not defined"
- `integration`: `[name].int.test.ts`, node, the app's real Prisma on a test database. A config of its own (`vitest.integration.config.mts`), not a project of `vitest.config.mts`: `npm run test` and `test:watch` run every project of the root config and would fail where there is no database. Run with `npm run test:integration`; setup in the README, "Integration tests"

- **Every test must be green, and `npm run test` must be run before every commit**, together with `npm run typecheck`, `npm run lint` and `npm run build`, `npm run test:integration` when a query or service changed, and `npm run test:e2e` when a page, a route or the sign-in or item flows changed (CI runs all of them on every PR). A failing test is fixed, or corrected on purpose when the rule changed; it is never skipped, disabled or deleted to get a commit through
- Test pure code first, without mocks: `domain/` files, `schemas.ts` and pure helpers in `lib` (for example `client-ip.ts`). A new business rule in `domain/` comes with its test in the same change
- Services come next, with their boundaries mocked (`@/lib/prisma`, `@/lib/rate-limit`, `@/lib/email`, `fetch`); assert the decision the service makes, not the mock calls for their own sake. `server-only` is aliased to the empty stub `test/server-only.ts` in `vitest.config.mts`, so queries, services and routes import normally
- `@/lib/sentry` is aliased to the stub `test/sentry.ts` in every Vitest project (`vitest.shared.mts`), so a module that logs does not load the Sentry SDK. A test of the logger or of `lib/sentry.ts` replaces it with `vi.mock` and a factory, or imports the real file by its relative path. A test that asserts what is logged mocks `@/lib/logger` with a factory (`{ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }`)
- Components and hooks (`dom`) test what a user or the caller sees, not how the code gets there: query by role and label (`getByRole`, `getByLabelText`), `userEvent` over `fireEvent`, assert the text on screen, the value passed to a callback, the toast. No snapshot tests of markup
- Mock at the boundary: Server Actions, `next/navigation`, the `fetch-*` helpers of `components/`, `sonner`. Every mock is a factory that exports each name its importers use. An automock (`vi.mock(path)` with no factory) imports the real module and its whole chain (`next-auth`, Prisma, `next/server`), which does not load under Vitest, whatever the environment variables are. A heavy child (the item editors) may be replaced by a probe that shows what it received; the hooks, the provider and Radix around it stay real
- A race or an abort is tested with `Promise.withResolvers()`: the test decides which answer arrives when and lets it through with `await act(async () => …)`. Test the rules of a hook through its own `renderHook` test, and the wiring that only a provider or form owns through that component
- `test/dom-setup.ts` loads the jest-dom matchers, runs `cleanup` after each test and sets `IS_REACT_ACT_ENVIRONMENT` (Vitest globals are off, so Testing Library cannot do either). It also holds the jsdom polyfills Radix needs; add one only when a test fails without it, with a comment naming the test
- The `dom` project runs through the React Compiler like the app does (`reactCompiler` in `next.config.ts`; `@vitejs/plugin-react` and `@rolldown/plugin-babel` with `reactCompilerPreset()`), so a test sees the memoized functions that ship. The test files themselves stay out of the Babel pass. The cost is three more dev dependencies and a Babel pass per run. `src/lib/react-compiler.test.tsx` fails if the compiler stops running in tests (it checks the helper `test/compiler-canary.ts`, because test files are not compiled), so a Dependabot bump of either plugin is caught. The `dom` project also sets `mockReset: true`: a test sets up every mock it uses, and none carries over to the next
- Not unit-tested: layer and import rules and domain purity (ESLint enforces them), thin `actions/`, pages and `components/ui`. Vitest cannot render async Server Components, so pages are covered by the end-to-end smoke tests (`e2e/`, see "End-to-end tests" below)
- A `*.test.ts` file inside `domain/` may import `vitest`: the package allowlist of the domain core applies to the rules, not to their tests
- Each test pins a rule or an edge case that would hurt if it broke; do not write tests just to have them

### Integration tests

A test with a mocked Prisma passes whatever the `where` says, so ownership is proved here: every query and service that takes a `userId` gets a cross-user case in the same change.

- What is real: only Prisma and Postgres. Upstash, R2, Resend, Stripe, OpenAI and the GitHub grant revocation are mocked for every file in `test/integration/setup.ts`, each name with a default answer passed to `vi.fn(impl)` (it survives `mockReset`); `fetch` throws. A test that needs another answer sets it itself
- The database: `TEST_DATABASE_URL` (CI: a `postgres:18` service; locally `.env.test`). `test/integration/global-setup.ts` refuses anything `requireTestDatabase` does not allow, then runs `prisma migrate deploy`; the config hands the URL to each worker as `DATABASE_URL`. Files run one at a time (`fileParallelism: false`)
- The data: `seedTenants()` in `test/integration/fixtures.ts` empties every table and seeds user A (Free) and user B (Pro) through the services. A file whose tests write seeds in `beforeEach`, a read-only one in `beforeAll`. `snapshotTenant(userId)` (`test/integration/snapshot.ts`) reads every row of a user for a `toEqual` before and after
- A cross-user case starts with the owner: B's call finds the row, then A's call with B's id gets nothing or "not found", and `snapshotTenant(B)` is unchanged. Without the owner's call, a wrong fixture id passes as "not found". For a list, A's ids are present and B's absent. A refusal is checked by its error text, not only `success: false`; an id the fixture may leave null goes through `required()`. A and B differ in password and session version, so a read by the wrong id cannot look right
- Writes on A's own data count too: the cleanups that run after them (`deleteOrphanTags`, the tokens of `deleteVerifiedUserRows`) must leave B's rows, so B has an unused tag and a verification token in the fixture
- Each file sits next to the file it tests. The thin read services of `items` share `items/services/item-reads.int.test.ts`
- Left out on purpose: the `ai` services and `checkAiAccess` (they read no rows of a user; the `userId` keys the quota), the email and token flows of `auth` (keyed by an email or a one-time token before sign-in), `files/services/objects`, `presignUpload`, `signItemFile` and `userCanUseType` (R2 keys and plan checks, unit-tested on their own). The tests prove the outcome of each operation, not every `where`: a second `where` behind a scoped read is still reviewed (see "Known risks" in `docs/architecture.md`)
- Checked once when this was built: removing `userId` from the `WHERE` of `setUserItemPin` or of `deleteOrphanTags`, or the advisory lock from `createUserItem`, makes a test fail

### End-to-end tests

Playwright (`@playwright/test`, pinned), Chromium only, in `e2e/` as `[name].spec.ts`, run with `npm run test:e2e`. Vitest cannot render async Server Components, so a few smoke journeys prove that sign-in, a page and an interaction work together in the production build. Full coverage is a later feature; a journey is added only when no unit, `dom` or integration test can prove the same.

- What runs: `playwright.config.ts` starts `npm run build && npm run start` on port 3100 (never 3000, and never a server that is already running) against the test database. `e2e/global-setup.ts` runs `scripts/seed-e2e.ts` in a child process: it migrates and empties the test database and creates a verified user with a new random email for the run. The `setup` project signs in once through the form and saves the session (`playwright/.auth/user.json`, ignored by git); the `chromium` project reuses it. A spec that needs a visitor overrides it with `test.use({ storageState: { cookies: [], origins: [] } })`
- Selectors by role and label only (`getByRole`, `getByLabel`), with `exact: true` where a name is part of another ("Sign in" and "Sign in with GitHub"). No CSS classes, no test ids. Assertions are web-first (`await expect(...)`), no `waitForTimeout`; ESLint (`no-floating-promises`) fails a call that is not awaited
- A test creates its own data under a unique title (`uniqueTitle`) and depends on no other test: the database holds the items of the whole run, and `--repeat-each` repeats a test. The only order is the setup before the tests
- The test server gets an environment built from scratch (`scripts/e2e-server-env.ts`): the test database, the test origin, dummies for Stripe, Resend, OpenAI, R2 and GitHub. Next also reads `.env`, `.env.local`, `.env.production` and `.env.production.local`, so a variable that map does not name would keep its live value; a unit test fails for any name in `.env.example` that the map leaves out. A new variable gets its line there in the same change
- Sign-in is rate-limited in Upstash, which outlasts the database. The email is new for every run, and `signInThroughForm` sets a random test IP (203.0.113.x) on the context before each sign-in, so no run uses up the counters of another
- A click before React has hydrated a client component does nothing, so the first interaction on a page that needs one is repeated until it takes (`toPass`, see `createSnippet`)
- Run it when a page, a route or the sign-in or item flows changed; CI runs it on every PR after `ci`. A failing journey is fixed, never skipped: open its trace (`npx playwright show-trace`, or the HTML report uploaded by the CI job). It empties the same database as the integration tests, so never run both at once. `npx playwright test --repeat-each=8` is the flake check (stay under 9: each repeat creates six items, and the Free plan allows 50). Setup: README, "End-to-end tests"
- Not asserted on purpose: focus returning after the route drawer closes (a known bug, `context/todo.md`, "Items")
