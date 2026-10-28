# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

@AGENTS.md

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

The structure of `src/` is explained for newcomers in `docs/architecture.md` (not auto-loaded: read it when adding a feature). The rules stay in `context/coding-standards.md`, and the guide is updated whenever the structure changes.

Work deferred on purpose is listed in `context/todo.md` (not auto-loaded: read it when the project is feature-complete or when asked what is left).

## Commands

- `npm run dev` — start the dev server (Turbopack, Next.js 16 default)
- `npm run build` — production build (Turbopack by default)
- `npm run start` — run the production build
- `npm run lint` — ESLint via flat config
- `npm run test` — Vitest, one run; must be green and run before every commit
- `npm run test:watch` — Vitest in watch mode

Tests are colocated as `[name].test.ts`; what to test and how is in "Testing" in `context/coding-standards.md`.

## Neon MCP

- For any request involving the Neon MCP (queries, schema inspection, migrations, branch operations), work only with the `development` branch of the `devstash` project
- Always pass `branch_id` explicitly (development: `br-super-sound-b4wxm3u6`, project: `purple-voice-82062641`). If it's omitted, Neon falls back to the default branch, which is `production`
- Never read from, write to, or change the schema of the `production` branch unless I explicitly ask for it
