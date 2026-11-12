# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix. Each step names the skill or agent that runs it; this section is the one place that says so (the README and `.claude/skills/README.md` link here).

1. **Document** (`/feature load`) - Document the feature in @context/current-feature.md, with the model for each phase ("Choosing the model" below)
2. **Branch** (`/feature start`) - Create new branch for feature, fix, etc
3. **Review the plan** (`/feature start`, agent `architecture-reviewer`) - Before any code, send the plan to the agent: the whole feature plan at `/feature start`, and again for every later step that changes structure (new routes, providers, a different data flow, new or changed actions). Cosmetic steps (a color, a text, a spacing) skip it. Give the agent the plan and the file paths only, not your reasoning, so its review stays independent. Settle the findings as described in "Working with review agents", then show me the agreed plan and wait for my go
4. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
5. **Test** (`/feature test`) - Add unit tests for new pure logic (see "Testing" in @context/coding-standards.md). Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build`, `npm run test:integration` when a query or service changed (a cross-user case for each new one), and `npm run test:e2e` when a page, a route or the sign-in or item flows changed, and fix any errors; every test must be green. I check the feature in the browser myself; the `ui-reviewer` agent runs only when I ask for it
6. **Review the code** (`/feature review`, agents `code-reviewer` and, when auth code changed, `auth-auditor`) - Both get the diff; settle their findings as described in "Working with review agents". The review also reads the IDE diagnostics and the lint ("Warnings at review" below)
7. **Iterate** - Iterate and change things if needed
8. **Commit** (`/feature complete`) - Only after the tests are green, the build passes and everything works. The reset of @context/current-feature.md and the entry in context/feature-history.md go into the feature's own commit
9. **PR and CI** (`/feature complete`) - Push the branch, open the PR with `gh`, wait for the `ci`, `integration` and `e2e` checks to be green
10. **Merge** (`/feature complete`) - After my go, merge the PR on GitHub (`gh pr merge --merge --delete-branch`), which deletes the branch there; then update the local `main` and delete the local branch

Do NOT commit without permission, and not until `npm run test` is green and the build passes. Run the tests again right before the commit, not only earlier in the feature. If a test or the build fails, fix the issues first; never skip, disable or delete a test to get a commit through. `git commit` and `git merge` run without a permission prompt, so this rule holds only because it is followed; `git push` asks first. `main` changes only through a PR merged on GitHub, and that merge deploys and migrates production, so it waits for my go.

### Working with review agents

An agent's findings are not handed to me to decide. For each one, take it, or answer the agent with your reasons and let it reply. At most 2 rounds: what is still open after that, you decide. Then tell me what was concluded, point by point, and why.

### Warnings at review

`/feature review` reads the IDE diagnostics of all files (`getDiagnostics` of the VS Code extension; the review agents have no IDE tools, so the main session does it) and runs `npm run lint`. The Problems panel stays clean, Tailwind canonical-class hints included:

- A warning in a file the feature changed is fixed in the feature
- A warning in another file is named in the verdict with its fix and goes into its own change, so the feature does not grow
- A warning that the IDE shows and `npm run lint` does not is a gap in the lint, so its fix comes with the guard that closes the gap, in this order: an ESLint rule, or a change of the scope of one, in `eslint.config.mjs` with its line in "What the lint enforces" in `architecture-rules.md` (example: `components/ui` is exempt from `better-tailwindcss/enforce-canonical-classes`, so a canonical-class hint there reaches the Problems panel and never the lint); else a line in the matching section of `coding-standards.md`, or in `architecture-rules.md` when it is about where code goes. A rule change that is more than a new check gets an ADR in `docs/adr/` (rule 10 of "Where does this go")
- The final message names each warning, what fixed it and which guard was added

### Choosing the model

`/feature load` rates the spec by what it builds, not by its length, and writes the result under `## Model` in @context/current-feature.md; `/feature start` compares it with the model of the session before it plans. The table is a recommendation: the session model changes with `/model`, and an agent uses the `model:` line of its file, which a call can override.

Only Opus and Sonnet are used, for the session and for every agent. Fable, and any model that costs extra usage or eats the plan's limit faster, is never chosen, recommended or passed as an agent's `model`, whatever the spec builds.

| What the spec builds                                                                                    | Plan (`/feature start`) | Implementation | `architecture-reviewer` |
| ------------------------------------------------------------------------------------------------------- | ----------------------- | -------------- | ----------------------- |
| A new module or rank, a Prisma migration, auth, billing, a different data flow, a change to a lint rule | Opus                    | Opus           | Opus                    |
| A new route, action or query inside an existing module, a new dependency                                | Opus                    | Sonnet         | Opus                    |
| Cosmetic work, a text, a color, a known API with no new decision                                        | Sonnet                  | Sonnet         | Opus                    |

The plan is where a mistake costs most, so it gets Opus. `/feature start` rates again after it has read `docs/modules.md`: a spec that turns out to be a new module or a migration moves up a row. The names are the aliases of the `model:` field (`sonnet`, `opus`), so no version goes stale here.

### Agents

| Agent | Model | When | Input |
| ----- | ----- | ---- | ----- |
| `architecture-reviewer` | Opus | Before code: the feature plan, and every later step that changes structure | The plan and the file paths |
| `code-reviewer` | Opus | After code, in `/feature review`; on request over all of `src/` every few features, to find duplication between modules | The diff, or nothing for a full scan |
| `auth-auditor` | Opus | In `/feature review` when auth code changed (report in chat); on request as a full audit (writes `docs/audit-results/AUTH_SECURITY_REVIEW.md`) | The diff, or "full audit" |
| `ui-reviewer` | Sonnet | Only when I ask, with the dev server running | The pages or the change, and the demo password from `.env.demo` |

Where the Model column names a model other than the file's `model:` line, Claude passes it as the `model` of that call.

The built-in `/simplify`, `/code-review` and `/security-review` are quick checks that do not know the project rules; they do not replace the agents.

### Periodic tasks

- `/cleanup` (and `/cleanup run` to apply fixes): housekeeping and the architecture checks a search can answer
- `code-reviewer` over all of `src/` every few features
- `auth-auditor` as a full audit after a change to auth
- Every couple of months: check `.claude/` (agents, skills, settings) for paths, tool names and permissions that no longer exist

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. `/feature complete` deletes it on GitHub and locally once the PR is merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Production standard

What a production project would not ship without is part of the feature. It is not a "nice to have" in the sense of "Code Changes" above. These items go into the plan from the start, as plan items and not as questions: the user's go on the plan covers them. Report what was done and why, instead of asking whether to do it.

- A check a feature adds to CI (a job, a test suite) becomes a required check on `main` once it has run green on the PR, and the docs that list the checks change in the same commit
- The secrets a new CI job needs come from the user (an account, a token). Once they are in `.env.test`, set them in GitHub with `gh`: piped from the file straight to `gh`, so the values never enter the conversation (the only use of an env file other than `.env.demo`, which is the only one `.env.example` lets Claude Code read)
- A new rule or flow comes with its tests; the docs and instructions that name it change in the same commit; a new variable, secret or job is written down where the next person looks (README, `.env.example`)
- Security basics hold without being asked: no secret in code, logs or URLs, least privilege (a CI secret is set on the step that needs it, not on the job), a migration that is backward compatible
- Ask only for what only the user can give or choose: an account, a token, a payment, a choice between vendors or plans, or a trade-off with no standard answer

This does not lift the gates above or the plan-first rule of the user's global instructions: the plan is shown and gets its go, the commit and the push of a feature wait for the user's go, `main` changes only through a PR merged on GitHub, and that merge waits for the user's go because it deploys production.

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)
