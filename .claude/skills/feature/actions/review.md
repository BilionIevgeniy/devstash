# Review Action

1. Read current-feature.md to understand the goals
2. Review all code changes made for this feature (`git diff main...HEAD` plus uncommitted changes)
3. Send the diff and the list of changed files to the `code-reviewer` agent. If the feature changed auth code (`src/features/auth`, the sign-in, register, forgot-password, reset-password or verify-email routes, profile or settings), also send them to the `auth-auditor` agent as a feature review: its report comes back in chat and it writes no file
4. Go through each agent finding the way "Review the plan" in `context/ai-interaction.md` describes for reviews: take it, or answer the agent with your reasons, at most 2 rounds, then decide
5. Check list for:
   - ✅ Goals met
   - ❌ Goals missing or incomplete
   - ⚠️ Code quality issues or bugs (yours and the agents' findings that were taken)
   - 🚫 Scope creep (code beyond goals)
6. Final verdict: Ready to complete or needs changes, shown as a table with the signs of the check list, followed by what was decided on the agents' findings and why
