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
- Production deployments must run `prisma migrate deploy` before the app starts

## Data Fetching

- Server components fetch through the feature's `queries.ts` (Prisma, scoped by userId; the one exception is in rule 4 of "Where does this go" in [architecture-rules.md](architecture-rules.md))
- Client components use Server Actions
- Validate all inputs with Zod; the schemas live in the feature's `schemas.ts`

## Error Handling

- Use try/catch in Server Actions
- Return the `ActionResult<T>` pattern `{ success, data, error }` from actions
- Display user-friendly error messages via toast

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
- A refactor keeps behaviour as it is: a split does not lock, unlock, reorder or rename anything the user sees

## Testing

Vitest, run with `npm run test` (one run) or `npm run test:watch`. Tests are colocated as `[name].test.ts`, run in the node environment, and import `describe`, `it` and `expect` from `vitest` explicitly.

- **Every test must be green, and `npm run test` must be run before every commit**, together with `npx tsc --noEmit`, `npm run lint` and `npm run build`. A failing test is fixed, or corrected on purpose when the rule changed; it is never skipped, disabled or deleted to get a commit through
- Test pure code first, without mocks: `domain/` files, `schemas.ts` and pure helpers in `lib` (for example `client-ip.ts`). A new business rule in `domain/` comes with its test in the same change
- Services come next, with their boundaries mocked (`@/lib/prisma`, `@/lib/rate-limit`, `@/lib/email`, `fetch`); assert the decision the service makes, not the mock calls for their own sake. `server-only` is aliased to the empty stub `test/server-only.ts` in `vitest.config.mts`, so queries, services and routes import normally
- Not unit-tested: layer and import rules and domain purity (ESLint enforces them), thin `actions/`, pages and `components/ui`. Vitest cannot render async Server Components, so pages belong to end-to-end tests when those are added
- A `*.test.ts` file inside `domain/` may import `vitest`: the package allowlist of the domain core applies to the rules, not to their tests
- Each test pins a rule or an edge case that would hurt if it broke; do not write tests just to have them
