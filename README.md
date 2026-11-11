# DevStash

One searchable hub for a developer's knowledge: snippets, AI prompts, notes, commands, files, images and links, organized in collections, with AI help (auto-tagging, summaries, Explain Code) on the Pro plan.

What the product is and who it is for: [context/project-overview.md](context/project-overview.md). Built features: [context/feature-history.md](context/feature-history.md).

## Stack

| Area | Choice |
| ---- | ------ |
| Framework | Next.js 16 (App Router, Turbopack, React 19 with the React Compiler) |
| Language | TypeScript, strict |
| Database | Neon PostgreSQL with Prisma ORM |
| Auth | NextAuth v5: email and password, GitHub OAuth |
| Styling | Tailwind CSS v4 (configured in CSS, no `tailwind.config`) and shadcn/ui |
| Files | Cloudflare R2, uploaded by the browser through presigned URLs |
| Billing | Stripe subscriptions, synced by webhook |
| AI | OpenAI |
| Email, rate limits | Resend, Upstash Redis |
| Tests | Vitest, React Testing Library |
| Hosting | Vercel |

## Getting started

1. **Node 24** (`.nvmrc`, `engines` in `package.json`, the same major as the Vercel project setting): `nvm install` once, then `nvm use`
2. **Install**: `npm install` (it also generates the Prisma client and copies the Monaco editor files)
3. **Environment**: copy `.env.example` to `.env` and fill it in. Each variable is explained there. Use the `development` branch of the Neon project, never production, and test keys for Stripe
4. **Demo password**: put `SEED_DEMO_PASSWORD` in `.env.demo` rather than `.env`. The seed reads both files; `.env.demo` is the one env file Claude Code is allowed to read, so the `ui-reviewer` agent can sign in
5. **Database**: `npx prisma migrate dev`, then `npm run db:seed`
6. **Run**: `npm run dev` and open [http://localhost:3000](http://localhost:3000)

The seed creates the system item types and two demo users with the same password and content:

| User | Plan | Where |
| ---- | ---- | ----- |
| `demo@devstash.io` | Free, one short of both Free limits | Every database the seed runs on |
| `demo-pro@devstash.io` | Pro (active subscription, no Stripe customer, so "Manage billing" does not open) | The development database only |

## Scripts

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Dev server |
| `npm run build` | Production build. Touches no database |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint, including the architecture boundaries and size limits |
| `npm run typecheck` | `next typegen && tsc --noEmit`: route types, then the type check |
| `npm run db:migrate:deploy` | `prisma migrate deploy`: applies pending migrations without creating any. **It has no guard**: it migrates whatever database `DIRECT_URL` in `.env` names, so check it first |
| `npm run vercel-build` | The Vercel Build Command (`vercel.json`): migrates the environment's own database through a guard, then builds. Refuses to run outside Vercel |
| `npm run test` / `npm run test:watch` | Vitest, one run / watch mode. Needs no database |
| `npm run test:integration` | The integration tests (`*.int.test.ts`) on the test database: see [Integration tests](#integration-tests) |
| `npm run test:e2e` | The end-to-end tests (`e2e/`, Playwright) against the production build on the test database: see [End-to-end tests](#end-to-end-tests) |
| `npm run db:seed-test` | Empty the test database and seed the system types, a Free and a Pro user. Reads `TEST_DATABASE_URL` only |
| `npm run db:seed` | Seed system types and demo users (safe to run again) |
| `npm run db:reset-demo` | Remove the Free demo user's items, collections, tags, files and subscription; run `db:seed` next |
| `npm run db:delete-users` | Delete every user except the two demo users (development database only) |
| `npm run db:test` | Check the database connection and the demo data |
| `npm run db:studio` | Prisma Studio |

Before every commit: `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build` must all pass, `npm run test:integration` when a query or service changed, and `npm run test:e2e` when a page, a route or the sign-in or item flows changed. CI runs all six on every PR and every push to `main`. Schema changes go through `prisma migrate dev`, never `db push`.

### Integration tests

They run the app's Prisma against a Postgres of their own and empty it before each file, so they never use the database of `.env`. `requireTestDatabase` (`scripts/require-dev-database.ts`) refuses any host but `localhost`, `127.0.0.1` or the one in `TEST_DATABASE_HOST`, and always refuses the `development` and production branches and any pooled (`-pooler`) host.

1. **A local Postgres**, the same major version as Neon (18):
   `docker run -d --name devstash-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=devstash_test -p 5433:5432 postgres:18`
2. **`.env.test`** (ignored by git) with this line (the end-to-end tests add two more, below):
   `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/devstash_test`
3. **Run**: `npm run test:integration`. It applies the migrations first

A Neon branch made only for tests works too: put its **direct** URL (not `-pooler`) in `TEST_DATABASE_URL` and its host in `TEST_DATABASE_HOST`. It is slower, since every test seeds over the network.

### End-to-end tests

A few Playwright journeys (sign in, create a snippet, open it in the drawer and close it with Esc, the footer's legal links) against the production build, on the test database. Async Server Components cannot be rendered by Vitest, so this is where pages are proved.

1. **The test database** of the integration tests (steps 1 and 2 above)
2. **Upstash.** Sign-in is rate-limited and fails closed, so the server needs a real Upstash database. The free plan allows one, so the tests use the app's own. Their keys never meet a user's: the email is new for every run and each sign-in sends a random test IP. Put its REST URL and a read-write token in `.env.test`:
   `E2E_UPSTASH_REDIS_REST_URL=...` and `E2E_UPSTASH_REDIS_REST_TOKEN=...`
   The `E2E_` prefix is on purpose: nothing from `.env` reaches the tests. A dedicated database later means new values here and in the GitHub secrets, no code ([`context/todo.md`](context/todo.md))
3. **The browser, once**: `npx playwright install chromium`
4. **Run**: `npm run test:e2e`. It builds the app, starts it on port 3100, empties and seeds the test database and runs the journeys (about 15 seconds after the build). A failing test leaves `test-results/<test>/trace.zip`: open it with `npx playwright show-trace <file>`. `npx playwright test --repeat-each=10` is the flake check (each repeat creates two items and the Free plan allows 50, so stay under 25)

Good to know:

- It empties the same database as the integration tests, so never run both at once
- The server starts with an environment built from scratch (`scripts/e2e-server-env.ts`), not from `.env`: no live Stripe, Resend, OpenAI or R2 key can reach it. Next also loads `.env.local`, `.env.production` and `.env.production.local`, which is why the map names every variable of `.env.example`, and a unit test fails when a new one is missing
- `playwright/.auth/user.json` belongs to the user of one run. After a new seed run the whole suite, not one spec with `--no-deps`: that would reuse the session of a user who no longer exists

## Architecture

A modular monolith: one folder per feature in `src/features/`, ranked, and a feature imports only features of a lower rank. ESLint enforces the boundaries.

- [docs/architecture.md](docs/architecture.md): the guide for newcomers, with examples and the reference (operations, background work, public API, known risks)
- [context/architecture-rules.md](context/architecture-rules.md): the short rulebook
- [docs/modules.md](docs/modules.md): what each module owns and exposes
- [docs/adr/](docs/adr/README.md): the decisions behind the rules
- [context/coding-standards.md](context/coding-standards.md): TypeScript, React, Next.js, UI/UX, size limits, testing

This Next.js version differs from older ones: the installed docs in `node_modules/next/dist/docs/` win over memory.

## Working with Claude Code

The project is built with Claude Code. Its instructions load from [CLAUDE.md](CLAUDE.md), which pulls in the files in `context/`.

- **The workflow**, step by step, with the skill or agent that runs each step: "Workflow" in [context/ai-interaction.md](context/ai-interaction.md). That section is the single source; this README does not repeat it
- **The skills and agents**, what each one does: [.claude/skills/README.md](.claude/skills/README.md)

In short: a feature goes `/feature load` → `/feature start` (plan reviewed by `architecture-reviewer`) → code → `/feature test` → `/feature review` (`code-reviewer`, plus `auth-auditor` for auth changes) → `/feature complete`. Browser checks are done by hand; `ui-reviewer` runs only when asked.

Guard rails in `.claude/settings.json`: Claude Code cannot read `.env`. Work deferred on purpose is in `context/todo.md`.

## Deployment

Vercel. A push to `main` deploys production. Vercel runs `npm run vercel-build`: `scripts/migrate-if-allowed.ts` applies pending migrations to that environment's own database, then the app is built. Production migrates only the production Neon branch; every preview uses the `development` branch, and its build fails if its URLs point anywhere else. Why, and how to ship a breaking schema change: [ADR 0013](docs/adr/0013-how-schema-changes-reach-production.md).

### CI and branch protection

`.github/workflows/ci.yml` runs three jobs on every PR and every push to `main`: `ci` (lint, typecheck, tests and the build, with dummy env values and no database), `integration` (the integration tests on a `postgres:18` service container, created empty for the run; no secret) and `e2e` (the end-to-end tests, after `ci`, on a `postgres:18` container of its own with Chromium installed in the job; the HTML report with the traces is uploaded when it fails). `e2e` is the only job with secrets, `E2E_UPSTASH_REDIS_REST_URL` and `E2E_UPSTASH_REDIS_REST_TOKEN`: add them under **Settings > Secrets and variables > Actions** and again under **Dependabot**, because GitHub gives a Dependabot PR only its own secrets. A PR from a fork gets none, and `e2e` fails with the message of the config. Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm, minor and patch grouped, and for GitHub Actions.

Branch protection on `main` is set in GitHub, not in code:

1. Repository **Settings > Branches > Add branch ruleset** (or "Add classic branch protection rule"), target branch `main`
2. Turn on **Require a pull request before merging**
3. Turn on **Require status checks to pass**, add the checks **`ci`**, **`integration`** and **`e2e`** (they appear after the workflow has run once), and turn on **Require branches to be up to date before merging**
4. Turn on **Block force pushes**, then save
