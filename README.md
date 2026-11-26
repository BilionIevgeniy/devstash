# DevStash

One searchable hub for a developer's knowledge: snippets, AI prompts, notes, commands, files, images and links, organized in collections, with AI help (auto-tagging, summaries, Explain Code) on the Pro plan.

What the product is and who it is for: [context/project-overview.md](context/project-overview.md). Built features: [context/feature-history.md](context/feature-history.md).

## Stack

| Area               | Choice                                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router, Turbopack, React 19 with the React Compiler)                                                                                             |
| Language           | TypeScript, strict                                                                                                                                               |
| Database           | Neon PostgreSQL with Prisma ORM                                                                                                                                  |
| Auth               | NextAuth v5: email and password, GitHub OAuth                                                                                                                    |
| Styling            | Tailwind CSS v4 (configured in CSS, no `tailwind.config`) and shadcn/ui                                                                                          |
| Files              | Cloudflare R2, uploaded by the browser through presigned URLs                                                                                                    |
| Billing            | Stripe subscriptions, synced by webhook                                                                                                                          |
| AI                 | OpenAI                                                                                                                                                           |
| Languages          | English and German with next-intl: `/` and `/de` for the homepage, a cookie or the browser's language for the app ([ADR 0024](docs/adr/0024-locale-decision.md)) |
| Email, rate limits | Resend, Upstash Redis                                                                                                                                            |
| Tests              | Vitest, React Testing Library, Playwright                                                                                                                        |
| Hosting            | Vercel                                                                                                                                                           |

## Getting started

1. **Node 24** (`.nvmrc`, `engines` in `package.json`, the same major as the Vercel project setting): `nvm install` once, then `nvm use`
2. **Install**: `npm install` (it also generates the Prisma client and copies the Monaco editor files)
3. **Environment**: copy `.env.example` to `.env` and fill it in. Each variable is explained there. Use the `development` branch of the Neon project, never production, and test keys for Stripe
4. **Demo password**: put `SEED_DEMO_PASSWORD` in `.env.demo` rather than `.env`. The seed reads both files; `.env.demo` is the one env file Claude Code is allowed to read, so the `ui-reviewer` agent can sign in
5. **Database**: `npx prisma migrate dev`, then `npm run db:seed`
6. **Run**: `npm run dev` and open [http://localhost:3000](http://localhost:3000)

The seed creates the system item types and two demo users with the same password and content:

| User                   | Plan                                                                             | Where                           |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| `demo@devstash.io`     | Free, one short of both Free limits                                              | Every database the seed runs on |
| `demo-pro@devstash.io` | Pro (active subscription, no Stripe customer, so "Manage billing" does not open) | The development database only   |

The development seed differs from production on purpose: there the demo user stays Pro, with all 20 items and 7 collections of the demo migrations. The seed takes 12 of those items (their content, tags, favorites and pins as in migration `20261030120000_demo_items_content`) and the `React Patterns` collection, and adds the 37 items of `Pagination Test` (`prisma/seed-pagination-data.ts`), so the Free demo user has 49 items and 2 collections, one short of both limits. Collection pagination cannot be checked with it. A second run creates only what is missing and leaves existing items as they are: to get the seed's content on a database that has older demo items, run `npm run db:reset-demo` first.

## Scripts

| Command                                         | What it does                                                                                                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                   | Dev server                                                                                                                                                                                                                   |
| `npm run build`                                 | Production build. Touches no database                                                                                                                                                                                        |
| `npm run start`                                 | Run the production build                                                                                                                                                                                                     |
| `npm run lint`                                  | ESLint, including the architecture boundaries and size limits                                                                                                                                                                |
| `npm run format` / `npm run format:check`       | Prettier over the whole repository / the same as a check (CI). The editor formats on save with the same version (`.vscode/settings.json`)                                                                                    |
| `npm run lint:dup`                              | jscpd copy-paste report over `src/` (a report for `/cleanup`, not a CI check)                                                                                                                                                |
| `npm run typecheck`                             | `next typegen && tsc --noEmit`: route types, then the type check                                                                                                                                                             |
| `npm run db:migrate:deploy`                     | `prisma migrate deploy`: applies pending migrations without creating any. **It has no guard**: it migrates whatever database `DIRECT_URL` in `.env` names, so check it first                                                 |
| `npm run vercel-build`                          | The Vercel Build Command (`vercel.json`): migrates the environment's own database through a guard, then builds. Refuses to run outside Vercel                                                                                |
| `npm run test` / `npm run test:watch`           | Vitest, one run / watch mode: the unit, component and story tests. Needs no database; the story tests need Chromium (`npx playwright install chromium`, once)                                                                |
| `npm run test:storybook`                        | Only the story tests: every story in Chromium, with its `play` steps and the axe check                                                                                                                                       |
| `npm run storybook` / `npm run build-storybook` | Storybook on port 6006 / the static build in `storybook-static/`: see [ADR 0026](docs/adr/0026-storybook-and-story-tests.md)                                                                                                 |
| `npm run db:check-migrations`                   | Apply the migrations to the test database and fail when `schema.prisma` differs from them, a schema change without its migration (CI, [ADR 0028](docs/adr/0028-schema-drift-check-in-ci.md)). Reads `TEST_DATABASE_URL` only |
| `npm run test:integration`                      | The integration tests (`*.int.test.ts`) on the test database: see [Integration tests](#integration-tests)                                                                                                                    |
| `npm run test:e2e`                              | The end-to-end tests (`e2e/`, Playwright) against the production build on the test database: see [End-to-end tests](#end-to-end-tests)                                                                                       |
| `npm run db:seed-test`                          | Empty the test database and seed the system types, a Free and a Pro user. Reads `TEST_DATABASE_URL` only                                                                                                                     |
| `npm run db:seed`                               | Seed system types and demo users (safe to run again)                                                                                                                                                                         |
| `npm run db:reset-demo`                         | Remove the Free demo user's items, collections, tags, files and subscription; run `db:seed` next                                                                                                                             |
| `npm run db:delete-users`                       | Delete every user except the two demo users (development database only)                                                                                                                                                      |
| `npm run db:test`                               | Check the database connection and the demo data                                                                                                                                                                              |
| `npm run db:studio`                             | Prisma Studio                                                                                                                                                                                                                |

Before every commit: `npm run format:check`, `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build` must all pass, `npm run test:integration` when a query or service changed, and `npm run test:e2e` when a page, a route or the sign-in or item flows changed. CI runs all seven on every PR and every push to `main`. Schema changes go through `prisma migrate dev`, never `db push`.

### After a production deploy

`.github/workflows/post-deploy.yml` runs when Vercel reports a successful production deployment: `scripts/post-deploy-smoke.ts` asks the live domain for the homepage, `/de`, the sign-in and registration, Auth.js's session, the app's redirect to sign-in, the imprint and `robots.txt`, with up to five rounds while the domain moves to the new deployment. A red run means the live site is broken although the build passed; the way back is Instant Rollback in Vercel's dashboard. Run it by hand with `SMOKE_ORIGIN=https://devstash.ievgenbilion.de node scripts/post-deploy-smoke.ts`.

### Integration tests

They run the app's Prisma against a Postgres of their own and empty it before each file, so they never use the database of `.env`. `requireTestDatabase` (`scripts/require-dev-database.ts`) refuses any host but `localhost`, `127.0.0.1` or the one in `TEST_DATABASE_HOST`, and always refuses the `development` and production branches and any pooled (`-pooler`) host.

1. **A local Postgres**, the same major version as Neon (18):
   `docker run -d --name devstash-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=devstash_test -p 5433:5432 postgres:18`
2. **`.env.test`** (ignored by git) with this line (the end-to-end tests add two more, below):
   `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/devstash_test`
3. **Run**: `npm run test:integration`. It applies the migrations first

A Neon branch made only for tests works too: put its **direct** URL (not `-pooler`) in `TEST_DATABASE_URL` and its host in `TEST_DATABASE_HOST`. It is slower, since every test seeds over the network.

### End-to-end tests

Playwright journeys against the production build, on the test database: sign-in and sign-out, creating, opening and deleting items, the Free limit, favorites and pins, uploads, import and export, the password change, the lists, search, languages, consent and the shop. Besides them, an axe scan of the main pages (`e2e/a11y.spec.ts`) and screenshot baselines of six screens (`e2e/visual.spec.ts`), both in the dark and the light theme. Async Server Components cannot be rendered by Vitest, so this is where pages are proved. No real vendor is reached: OpenAI, R2, Upstash and Sentry's ingest are local stand-ins ([ADR 0035](docs/adr/0035-e2e-stand-ins-and-visual-baselines.md)). `e2e/egress.spec.ts` checks what would leave the app through Sentry and the server's log, and every test fails on a Content-Security-Policy violation ([ADR 0036](docs/adr/0036-content-security-policy.md)).

1. **The test database** of the integration tests (steps 1 and 2 above)
2. **Redis and its REST API, once.** Sign-in is rate-limited and fails closed, so the server needs the Upstash REST API. A plain Redis with serverless-redis-http (SRH) in front stands in for it; Playwright starts `scripts/fake-upstash.ts` in front of SRH, which drops the one Upstash-only flag of ratelimit's scripts:
   `docker network create devstash-e2e`
   `docker run -d --name devstash-e2e-redis --network devstash-e2e redis:8`
   `docker run -d --name devstash-e2e-srh --network devstash-e2e -p 8079:80 -e SRH_MODE=env -e SRH_TOKEN=e2e-local-redis-token -e SRH_CONNECTION_STRING=redis://devstash-e2e-redis:6379 hiett/serverless-redis-http:0.0.10`
   The token is no secret: SRH listens on this machine only. When the containers are down, the run stops before the first test and says so. The `E2E_UPSTASH_*` lines of an older `.env.test` are no longer read
3. **The browser, once**: `npx playwright install chromium`
4. **Run**: `npm run test:e2e`. It builds the app, starts it on port 3100 with the stand-ins (OpenAI on 3101, R2 on 3102, the Upstash proxy on 3103, the Sentry ingest on 3104; the server's log goes to `playwright/server.log`), empties and seeds the test database and runs the suite. A failing test leaves `test-results/<test>/trace.zip`: open it with `npx playwright show-trace <file>`. `npx playwright test --repeat-each=4` is the flake check (each repeat leaves ten items on the run's user and the Free plan allows 50, so stay under 5)

Good to know:

- It empties the same database as the integration tests, so never run both at once
- The server starts with an environment built from scratch (`scripts/e2e-server-env.ts`), not from `.env`: no live Stripe, Resend, OpenAI, R2 or Upstash key can reach it. Next also loads `.env.local`, `.env.production` and `.env.production.local`, which is why the map names every variable of `.env.example`, and a unit test fails when a new one is missing
- `playwright/.auth/*.json` belong to the users of one run. After a new seed run the whole suite, not one spec with `--no-deps`: that would reuse the session of a user who no longer exists
- The stand-ins: `scripts/fake-openai.ts` answers the summary and the tag suggestions with fixed text; `scripts/fake-r2.ts` keeps uploaded files in memory (PUT, HEAD, GET, DELETE; anything else answers 501), reached through `R2_ENDPOINT`, which the app takes only for localhost; `scripts/fake-upstash.ts` forwards to SRH; `scripts/fake-sentry.ts` records every event, decoded. The test build also compiles the throw routes of `src/app/(e2e)/` (`E2E_BUILD=1`, which a Vercel build refuses). The lab measurements of `docs/performance.md` use the same setup: `npx playwright test --config playwright.perf.config.ts`
- The seed creates the run's user (Free) and five more, each with its session saved by `e2e/auth.setup.ts`: `lists-<run email>` (40 starred and pinned snippets, `e2e/infinite-lists.spec.ts`), `pro-<run email>` (an active subscription row, `e2e/ai-marking.spec.ts`), `over-<run email>` (a former Pro user over the Free limit, with kept files, `e2e/downgrade.spec.ts`), `visual-<run email>` (fixed rows and dates, never written to, for the screenshots and the axe scans) and `skeleton-<run email>` (Pro, rows that fill the skeletons, `e2e/skeletons.spec.ts`)
- `npm run test:instant` runs `e2e/instant.spec.ts` on `next dev` (port 3105, same database and stand-ins): it fails on any console error of a page, such as Next's instant validation or a hydration mismatch, which only a dev server reports. Stop your own `npm run dev` first, and never run it at the same time as `test:e2e`
- `e2e/skeletons.spec.ts` holds the server back with a lock on a table of the test database (`holdReads`): a page then shows its loading state until the test releases it
- A journey that changes its user for good or needs exact data gets a fresh user of its own (`signInFreshUser` in `e2e/support/fresh-user.ts`, which runs `scripts/e2e-fixture.ts`): the Free limit (a user with 49 items), sign-out, the password change (the change revokes every session of its user, so it never uses a saved one), favorites, uploads and import-export (a Pro user)
- **Screenshot baselines** are Linux only: on macOS and Windows `visual.spec.ts` is skipped, and the e2e job (pinned `ubuntu-24.04`) compares them, down to a colour about 5 grey levels off (`threshold` in `playwright.config.ts`). A new or changed screen fails the job. Download its artifact (`gh run download <run id> -n playwright-report`): a new screen's picture is in `e2e/visual.spec.ts-snapshots/`, a changed one leaves `-actual.png` and `-diff.png` in `test-results/`. Look at them, then copy each over its baseline in `e2e/visual.spec.ts-snapshots/` (named `<screen>-chromium-linux.png`) and commit. A Playwright update can shift text rendering: the Dependabot PR then gets its baselines the same way

## Architecture

A modular monolith: one folder per feature in `src/features/`, ranked, and a feature imports only features of a lower rank. ESLint enforces the boundaries.

- [docs/architecture.md](docs/architecture.md): the guide for newcomers, with examples and the reference (operations, background work, public API, known risks)
- [context/architecture-rules.md](context/architecture-rules.md): the short rulebook
- [docs/modules.md](docs/modules.md): what each module owns and exposes
- [docs/runbooks/frankfurt-move.md](docs/runbooks/frankfurt-move.md): the move of the database and the functions to Frankfurt, step by step
- [docs/performance.md](docs/performance.md): how bundle size and Web Vitals are measured, and the numbers
- [docs/adr/](docs/adr/README.md): the decisions behind the rules
- [docs/archive/](docs/archive/): the analyses item CRUD, the AI features and Stripe were built from, kept as they were; where one disagrees with the code or an ADR, it is outdated. Section 7 of the Stripe one is still the Dashboard setup
- [context/coding-standards.md](context/coding-standards.md): TypeScript, React, Next.js, UI/UX, size limits, testing

This Next.js version differs from older ones: the installed docs in `node_modules/next/dist/docs/` win over memory.

## Working with Claude Code

The project is built with Claude Code. Its instructions load from [CLAUDE.md](CLAUDE.md), which pulls in the files in `context/`.

- **The workflow**, step by step, with the skill or agent that runs each step: "Workflow" in [context/ai-interaction.md](context/ai-interaction.md). That section is the single source; this README does not repeat it
- **The skills and agents**, what each one does: [.claude/skills/README.md](.claude/skills/README.md)

In short: a feature goes `/feature load` → `/feature start` (plan reviewed by `architecture-reviewer`) → code → `/feature test` → `/feature review` (`code-reviewer`, plus `auth-auditor` for auth changes) → `/feature complete`. Browser checks are done by hand; `ui-reviewer` runs only when asked.

### How AI was used in this project

The code is written with Claude Code; the specs, the decisions and the responsibility for the result are the author's. What keeps that honest:

- **A spec before code.** Every feature starts as a file in `context/features/` with its scope, its non-goals and its acceptance criteria, and as a plan that a second agent (`architecture-reviewer`) reads without the first one's reasoning. Each finding is taken or answered with a reason; what came of it is in [context/feature-history.md](context/feature-history.md)
- **Rules a machine checks.** The boundaries, the size limits, the error contract and the ban on literal text are ESLint rules, not requests to a model ([context/architecture-rules.md](context/architecture-rules.md), "What the lint enforces")
- **Tests prove it, agents do not.** Unit, component, story, integration (two tenants on a real Postgres) and end-to-end tests run on every pull request, and `main` takes only a green one
- **Versions, not memory.** The installed docs and type definitions win over what a model remembers; deprecated APIs fail the lint
- **A written reason.** A changed rule gets a record in [docs/adr/](docs/adr/README.md), so the next session does not undo it
- **Limits.** Claude Code reads no `.env` and changes `main` only through a pull request

Guard rails in `.claude/settings.json`: Claude Code cannot read `.env`. Planned work is in `context/features/plan/`; what only a commercial launch needs is in `context/todo-before-live.md`.

## Deployment

Vercel. A push to `main` deploys production. Vercel runs `npm run vercel-build`: `scripts/migrate-if-allowed.ts` applies pending migrations to that environment's own database, then the app is built. Production migrates only the production Neon branch; every preview uses the `development` branch, and its build fails if its URLs point anywhere else. Why, and how to ship a breaking schema change: [ADR 0013](docs/adr/0013-how-schema-changes-reach-production.md).

### Secrets of the server

Two secrets have no default and are set in Vercel for Production and Preview, a different value in each (`openssl rand -hex 32`), and in `.env` locally: `RATE_LIMIT_HASH_KEY` keys the HMAC that names the rate-limit counters in Upstash (without it rate limiting fails closed and sign-in stops working; a new value resets every counter once), and `CRON_SECRET` signs the calls of Vercel Cron.

Preview needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as well, the same as Production: without them every preview refuses sign-in, for the same reason. The counters stay apart, since each environment has its own `RATE_LIMIT_HASH_KEY`.

### Stripe in test mode

The shop sells in EUR with VAT included and Stripe Tax ([ADR 0033](docs/adr/0033-tax-prices-and-payment-policy.md)). Before a purchase works in a sandbox, the account owner makes these Dashboard settings (all steps in [docs/archive/stripe-integration-plan.md](docs/archive/stripe-integration-plan.md), section 7):

1. Two recurring prices of "DevStash Pro" in EUR with tax behaviour "inclusive": €8 monthly and €72 yearly; their ids go to `STRIPE_PRICE_ID_MONTHLY` and `STRIPE_PRICE_ID_YEARLY` in `.env` and in Vercel
2. Stripe Tax: the origin address, the product tax code for SaaS, and a registration. Without the origin address Checkout refuses every session
3. The customer portal allows reactivating a subscription set to end, which the § 312k cancellation email points to

The consumer flow (order step, AGB, § 312f confirmation, § 312k cancellation at `/vertraege-kuendigen`) is in [ADR 0032](docs/adr/0032-consumer-flow.md).

### Scheduled jobs

`vercel.json` calls `GET /api/cron/daily` once a day at 03:00 UTC (Hobby allows no more, and runs it some time within that hour) with `Authorization: Bearer <CRON_SECRET>`. It deletes expired tokens, uploads no item holds after 24 hours and registrations never verified within 7 days ([ADR 0030](docs/adr/0030-daily-cron-and-retention.md)), and last compares every subscription with Stripe ([ADR 0033](docs/adr/0033-tax-prices-and-payment-policy.md)). Cron runs only on Production; a run and its counts are in the runtime logs (`Cron job … finished`). To run it by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/daily`.

Visitors who allow it in the consent banner send their real-user Web Vitals (LCP, INP, CLS) to `POST /api/vitals`, which writes one runtime log line per metric (`Web Vital LCP on /items/[type]`, the value under `numbers.value`) and stores nothing ([ADR 0034](docs/adr/0034-consent-and-field-measurement.md)). The page group is from a closed list, never the URL; the route counts 30 requests a minute per IP in memory and needs no setting.

### Error monitoring

Sentry, in its EU data region ([ADR 0016](docs/adr/0016-error-monitoring-with-sentry.md): what leaves the server and what never does). Without `NEXT_PUBLIC_SENTRY_DSN` the SDK is off, so local development needs no account. In Vercel set `NEXT_PUBLIC_SENTRY_DSN` for Production and Preview (it is built into the bundle: redeploy after a change) and, optionally, `SENTRY_DSN` for the same two (a second client key of the project that only the server uses, so forged events through the public key cannot starve the errors of the server), and `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` for Production only: they upload the source maps in the build, and a build without the token generates none. Each is explained in `.env.example`. The alert for new issues is set in Sentry, filtered to `environment:production`. The token is a secret: it goes into Vercel or `.env.local`, never into `.env.example`.

### CI and branch protection

`.github/workflows/ci.yml` runs three jobs on every PR and every push to `main`: `ci` (lint, typecheck, the tests with the story tests in Chromium, the build and the Storybook build, with dummy env values and no database), `integration` (the integration tests on a `postgres:18` service container, created empty for the run; no secret) and `e2e` (the end-to-end tests, after `ci`, on a pinned `ubuntu-24.04` runner with a `postgres:18` container of its own, Redis and SRH as the Upstash stand-in and Chromium installed in the job; the HTML report with the traces and `test-results/` are uploaded unless the run is cancelled). No job needs a secret, so fork and Dependabot PRs run all three. Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm, minor and patch grouped, and for GitHub Actions. Storybook, Vitest and Playwright each move as one group, majors included, because their packages require each other's exact version. Open Dependabot PRs are handled before a feature branch starts and before it is pushed ("Dependency updates (Dependabot)" in `context/ai-interaction.md`).

Branch protection on `main` is set in GitHub, not in code:

1. Repository **Settings > Branches > Add branch ruleset** (or "Add classic branch protection rule"), target branch `main`
2. Turn on **Require a pull request before merging**
3. Turn on **Require status checks to pass**, add the checks **`ci`**, **`integration`** and **`e2e`** (they appear after the workflow has run once), and turn on **Require branches to be up to date before merging**
4. Turn on **Block force pushes**, then save
