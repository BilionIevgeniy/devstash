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
| Tests | Vitest |
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
| `npm run test` / `npm run test:watch` | Vitest, one run / watch mode |
| `npm run db:seed` | Seed system types and demo users (safe to run again) |
| `npm run db:reset-demo` | Remove the Free demo user's items, collections, tags, files and subscription; run `db:seed` next |
| `npm run db:delete-users` | Delete every user except the two demo users (development database only) |
| `npm run db:test` | Check the database connection and the demo data |
| `npm run db:studio` | Prisma Studio |

Before every commit: `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build` must all pass. CI runs the same four on every PR and every push to `main`. Schema changes go through `prisma migrate dev`, never `db push`.

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

`.github/workflows/ci.yml` runs lint, typecheck, tests and the build (with dummy env values, no database) on every PR and every push to `main`. Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm, minor and patch grouped, and for GitHub Actions.

Branch protection on `main` is set in GitHub, not in code:

1. Repository **Settings > Branches > Add branch ruleset** (or "Add classic branch protection rule"), target branch `main`
2. Turn on **Require a pull request before merging**
3. Turn on **Require status checks to pass**, add the check **`ci`** (it appears after the workflow has run once), and turn on **Require branches to be up to date before merging**
4. Turn on **Block force pushes**, then save
