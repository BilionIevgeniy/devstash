# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Review the plan** - Before any code, send the plan to the `architecture-reviewer` agent (`.claude/agents/architecture-reviewer.md`): the whole feature plan at `/feature start`, and again for every later step that changes structure (new routes, providers, a different data flow, new or changed actions). Cosmetic steps (a color, a text, a spacing) skip it. Give the agent the plan and the file paths only, not your reasoning, so its review stays independent. Show me its findings with your answer to each (taken, or not and why); I decide
4. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
5. **Test** - Verify it works in the browser. Add unit tests for new pure logic (see "Testing" in @context/coding-standards.md). Run `npm run test` and `npm run build` and fix any errors; every test must be green
6. **Iterate** - Iterate and change things if needed
7. **Commit** - Only after the tests are green, the build passes and everything works
8. **Merge** - Merge to main
9. **Delete Branch** - Delete branch after merge
10. **Review** - Review AI-generated code periodically and on demand.
11. Mark as completed in @context/current-feature.md and add to history in context/feature-history.md

Do NOT commit without permission, and not until `npm run test` is green and the build passes. Run the tests again right before the commit, not only earlier in the feature. If a test or the build fails, fix the issues first; never skip, disable or delete a test to get a commit through.

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
