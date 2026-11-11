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

Work deferred on purpose is listed in `context/todo.md` (not auto-loaded: read it when the project is feature-complete or when asked what is left).

## Commands

- `npm run dev` — start the dev server (Turbopack, Next.js 16 default)
- `npm run build` — production build (Turbopack by default); touches no database
- `npm run typecheck` — `next typegen && tsc --noEmit`
- `npm run db:migrate:deploy` — `prisma migrate deploy`; on Vercel migrations run in `npm run vercel-build` through a guard (ADR 0013)
- `npm run start` — run the production build
- `npm run lint` — ESLint via flat config
- `npm run test` — Vitest, one run; must be green and run before every commit
- `npm run test:watch` — Vitest in watch mode
- `npm run test:integration` — the `*.int.test.ts` files against the test database (`TEST_DATABASE_URL` from `.env.test`, a local Docker Postgres on port 5433); run it when a query or service changed
- `npm run test:e2e` — the Playwright smoke tests in `e2e/` against the production build (`next build`, then `next start` on port 3100) on the test database; needs `TEST_DATABASE_URL` and `E2E_UPSTASH_REDIS_REST_URL`/`E2E_UPSTASH_REDIS_REST_TOKEN` in `.env.test` and Chromium (`npx playwright install chromium`, once); run it when a page, a route or the sign-in or item flows changed
- `npm run db:seed-test` — empty and seed the test database (system types, a Free and a Pro user)

Tests are colocated as `[name].test.ts` (node) and `[name].test.tsx` (components and hooks, jsdom); the end-to-end tests are `[name].spec.ts` in `e2e/`. What to test and how is in "Testing" in `context/coding-standards.md`.

## Neon MCP

- For any request involving the Neon MCP (queries, schema inspection, migrations, branch operations), work only with the `development` branch of the `devstash` project
- Always pass `branch_id` explicitly (development: `br-super-sound-b4wxm3u6`, project: `purple-voice-82062641`). If it's omitted, Neon falls back to the default branch, which is `production`
- Never read from, write to, or change the schema of the `production` branch unless I explicitly ask for it
