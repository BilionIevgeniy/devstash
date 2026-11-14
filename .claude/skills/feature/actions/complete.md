# Complete Action

The feature reaches `main` through a PR merged on GitHub after green `ci`, `integration` and `e2e` checks, never through a local merge and a push of `main`: branch protection rejects a direct push, and the merge commit would land without a CI result.

1. Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build`, `npm run test:integration` when a query or service changed, and `npm run test:e2e` when a page, a route or the sign-in or item flows changed; stop and fix if anything is not green
2. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals, Notes and Model sections (keep placeholder comments)
   - Add feature summary to the END of context/feature-history.md (not to current-feature.md)
3. Check context/todo-before-live.md and the specs in context/features/plan/ against what this feature built:
   - Delete each before-live item the feature finished, and each Scope item of a later spec it already did
   - Shorten an item the feature finished in part, so it says only what is left
   - Keep anything not clearly done, and name the deleted items in the final message
   - Write nothing new into either for later: work found during the feature is done in it ("Found work" in context/ai-interaction.md); only what cannot be built goes to the before-live file, and what is too large goes into the Scope of the matching spec
   - Tick the feature in context/features/plan/README.md
4. Commit on the feature branch (check `git branch --show-current` first):
   - Stage the feature's files by name, not `git add -A`
   - Check `git status`: a change that is not part of the feature stays unstaged, and the final message names it
   - Commit with a descriptive conventional message
5. Push the feature branch and open the PR if there is none: `gh pr create --base main` (title = the main commit message)
6. Wait for the `ci`, `integration` and `e2e` checks: `gh pr checks <number> --watch`
   - Red: fix, commit, push, wait again
   - No run starts within a few minutes (GitHub sometimes drops the PR event): `gh pr close <number>` and `gh pr reopen <number>`, then wait again
7. Do not ask before merging: once all three checks are green, the merge is the natural end of the task and goes ahead. It deploys production and runs its migrations (ADR 0013), so a red, pending or missing check means no merge
8. Merge on GitHub and delete the branch there: `gh pr merge <number> --merge --delete-branch`
9. Update the local `main` and remove the local branch:
   - `git switch main` and `git pull --ff-only`
   - If the feature branch still exists locally, check `git merge-base --is-ancestor <branch> main`, then `git branch -D <branch>`
10. Confirm the deploy: on the merge commit, `ci`, `integration`, `e2e` and the Vercel status are green (`gh api repos/{owner}/{repo}/commits/<sha>/check-runs` and `.../status`). A failed Vercel build keeps the previous deployment live; report it with the reason
