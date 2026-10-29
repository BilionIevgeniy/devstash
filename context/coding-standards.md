# Coding Standards

## TypeScript

- Strict mode enabled
- No `any` types - use proper typing or `unknown`
- Define interfaces for all props, API responses, and data models
- Use type inference where obvious, explicit types where helpful

## React

- Functional components only (no class components)
- Use hooks for state and side effects
- Keep components focused - one job per component
- Extract reusable logic into custom hooks

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
- Keep functions under 50 lines when possible

## Testing

Vitest, run with `npm run test` (one run) or `npm run test:watch`. Tests are colocated as `[name].test.ts`, run in the node environment, and import `describe`, `it` and `expect` from `vitest` explicitly.

- **Every test must be green, and `npm run test` must be run before every commit**, together with `npx tsc --noEmit`, `npm run lint` and `npm run build`. A failing test is fixed, or corrected on purpose when the rule changed; it is never skipped, disabled or deleted to get a commit through
- Test pure code first, without mocks: `domain/` files, `schemas.ts` and pure helpers in `lib` (for example `client-ip.ts`). A new business rule in `domain/` comes with its test in the same change
- Services come next, with their boundaries mocked (`@/lib/prisma`, `@/lib/rate-limit`, `@/lib/email`, `fetch`); assert the decision the service makes, not the mock calls for their own sake. `server-only` is aliased to the empty stub `test/server-only.ts` in `vitest.config.mts`, so queries, services and routes import normally
- Not unit-tested: layer and import rules and domain purity (ESLint enforces them), thin `actions/`, pages and `components/ui`. Vitest cannot render async Server Components, so pages belong to end-to-end tests when those are added
- A `*.test.ts` file inside `domain/` may import `vitest`: the package allowlist of the domain core applies to the rules, not to their tests
- Each test pins a rule or an edge case that would hurt if it broke; do not write tests just to have them
