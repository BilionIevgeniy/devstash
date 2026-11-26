# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

@AGENTS.md

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/architecture-rules.md
- @context/ai-interaction.md
- @context/current-feature.md

The structure of `src/` is explained for newcomers in `docs/architecture.md` (not auto-loaded: read it when adding a feature; its Reference section holds the operations table, background work, public API and known risks). The short rulebook is `context/architecture-rules.md`, and the guide is updated whenever the structure changes.

Planned work is in `context/features/plan/` (its README gives the order). What only a commercial launch needs is in `context/todo-before-live.md` (not auto-loaded: read it before a launch or when asked what a launch needs). Nothing new is deferred: "Found work" in `context/ai-interaction.md`.

## Commands

- `npm run dev` — start the dev server (Turbopack, Next.js 16 default)
- `npm run build` — production build (Turbopack by default); touches no database
- `npm run typecheck` — `next typegen && tsc --noEmit`
- `npm run db:check-migrations` — applies the migrations to the test database and fails when `schema.prisma` differs from them (a schema change without its migration); the first step of the `integration` job (ADR 0028)
- `npm run db:migrate:deploy` — `prisma migrate deploy`; on Vercel migrations run in `npm run vercel-build` through a guard (ADR 0013)
- `npm run start` — run the production build
- `npm run lint` — ESLint via flat config
- `npm run format` / `npm run format:check` — Prettier over the whole repository (its defaults, `.prettierrc`) / the same as a check, the first step of the `ci` job
- `npm run lint:dup` — jscpd copy-paste report over `src/` (for `/cleanup` and the code review; not a CI gate)
- `npm run test` — Vitest, one run; must be green and run before every commit
- `npm run test:watch` — Vitest in watch mode
- `npm run test:storybook` — only the story tests (the `storybook` project, part of `npm run test`): every `*.stories.tsx` rendered in Chromium with its `play` steps and the axe check; needs Chromium (`npx playwright install chromium`, once)
- `npm run storybook` / `npm run build-storybook` — Storybook on port 6006 / the static build; what gets a story is in "Stories" in `context/coding-standards.md` (ADR 0026)
- `npm run test:integration` — the `*.int.test.ts` files against the test database (`TEST_DATABASE_URL` from `.env.test`, a local Docker Postgres on port 5433); run it when a query or service changed
- `npm run test:e2e` — the Playwright smoke tests in `e2e/` against the production build (`next build`, then `next start` on port 3100) on the test database; needs `TEST_DATABASE_URL` and `E2E_UPSTASH_REDIS_REST_URL`/`E2E_UPSTASH_REDIS_REST_TOKEN` in `.env.test` and Chromium (`npx playwright install chromium`, once); run it when a page, a route or the sign-in or item flows changed
- `npm run db:seed-test` — empty and seed the test database (system types, a Free and a Pro user)

Tests are colocated as `[name].test.ts` (node), `[name].test.tsx` (components and hooks, jsdom) and `[name].stories.tsx` (stories, Chromium); the end-to-end tests are `[name].spec.ts` in `e2e/`. What to test and how is in "Testing" in `context/coding-standards.md`.

## Neon MCP

- For any request involving the Neon MCP (queries, schema inspection, migrations, branch operations), work only with the `development` branch of the `devstash-eu` project (Frankfurt, ADR 0038)
- Always pass `branch_id` explicitly (development: `br-ancient-surf-bhvbcik7`, project: `lively-wildflower-46234559`). If it's omitted, Neon falls back to the default branch, which is `production`
- Never read from, write to, or change the schema of the `production` branch unless I explicitly ask for it
