# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix. Each step names the skill or agent that runs it; this section is the one place that says so (the README and `.claude/skills/README.md` link here).

1. **Document** (`/feature load`) - Document the feature in @context/current-feature.md
2. **Branch** (`/feature start`) - Create new branch for feature, fix, etc
3. **Review the plan** (`/feature start`, agent `architecture-reviewer`) - Before any code, send the plan to the agent: the whole feature plan at `/feature start`, and again for every later step that changes structure (new routes, providers, a different data flow, new or changed actions). Cosmetic steps (a color, a text, a spacing) skip it. Give the agent the plan and the file paths only, not your reasoning, so its review stays independent. Settle the findings as described in "Working with review agents", then show me the agreed plan and wait for my go
4. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
5. **Test** (`/feature test`) - Add unit tests for new pure logic (see "Testing" in @context/coding-standards.md). Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build` and fix any errors; every test must be green. I check the feature in the browser myself; the `ui-reviewer` agent runs only when I ask for it
6. **Review the code** (`/feature review`, agents `code-reviewer` and, when auth code changed, `auth-auditor`) - Both get the diff; settle their findings as described in "Working with review agents"
7. **Iterate** - Iterate and change things if needed
8. **Commit** (`/feature complete`) - Only after the tests are green, the build passes and everything works
9. **Merge** - Merge to main
10. **Delete Branch** - Delete branch after merge
11. Mark as completed in @context/current-feature.md and add to history in context/feature-history.md (`/feature complete`)

Do NOT commit without permission, and not until `npm run test` is green and the build passes. Run the tests again right before the commit, not only earlier in the feature. If a test or the build fails, fix the issues first; never skip, disable or delete a test to get a commit through. `git commit` and `git merge` run without a permission prompt, so this rule holds only because it is followed; `git push` asks first, because a push to main deploys and migrates production.

### Working with review agents

An agent's findings are not handed to me to decide. For each one, take it, or answer the agent with your reasons and let it reply. At most 2 rounds: what is still open after that, you decide. Then tell me what was concluded, point by point, and why.

### Agents

| Agent | When | Input |
| ----- | ---- | ----- |
| `architecture-reviewer` | Before code: the feature plan, and every later step that changes structure | The plan and the file paths |
| `code-reviewer` | After code, in `/feature review`; on request over all of `src/` every few features, to find duplication between modules | The diff, or nothing for a full scan |
| `auth-auditor` | In `/feature review` when auth code changed (report in chat); on request as a full audit (writes `docs/audit-results/AUTH_SECURITY_REVIEW.md`) | The diff, or "full audit" |
| `ui-reviewer` | Only when I ask, with the dev server running | The pages or the change, and the demo password from `.env.demo` |

The built-in `/simplify`, `/code-review` and `/security-review` are quick checks that do not know the project rules; they do not replace the agents.

### Periodic tasks

- `/cleanup` (and `/cleanup run` to apply fixes): housekeeping and the architecture checks a search can answer
- `code-reviewer` over all of `src/` every few features
- `auth-auditor` as a full audit after a change to auth
- Every couple of months: check `.claude/` (agents, skills, settings) for paths, tool names and permissions that no longer exist

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

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

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)
