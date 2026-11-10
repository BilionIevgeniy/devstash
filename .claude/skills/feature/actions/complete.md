# Complete Action

The feature reaches `main` through a PR merged on GitHub after a green `ci` check, never through a local merge and a push of `main`: branch protection rejects a direct push, and the merge commit would land without a CI result.

1. Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build`; stop and fix if anything is not green
2. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals and Notes sections (keep placeholder comments)
   - Add feature summary to the END of context/feature-history.md (not to current-feature.md)
3. Read context/todo.md and check it against what this feature built:
   - Delete each item the feature finished
   - Shorten an item the feature finished in part, so it says only what is left
   - Keep anything not clearly done, and name the deleted items in the final message
4. Commit on the feature branch (check `git branch --show-current` first):
   - Stage the feature's files by name, not `git add -A`
   - Check `git status`: a change that is not part of the feature stays unstaged, and the final message names it
   - Commit with a descriptive conventional message
5. Push the feature branch and open the PR if there is none: `gh pr create --base main` (title = the main commit message)
6. Wait for the `ci` check: `gh pr checks <number> --watch`
   - Red: fix, commit, push, wait again
   - No run starts within a few minutes (GitHub sometimes drops the PR event): `gh pr close <number>` and `gh pr reopen <number>`, then wait again
7. Ask before merging: the merge deploys production and runs its migrations (ADR 0013)
8. Merge on GitHub and delete the branch there: `gh pr merge <number> --merge --delete-branch`
9. Update the local `main` and remove the local branch:
   - `git switch main` and `git pull --ff-only`
   - If the feature branch still exists locally, check `git merge-base --is-ancestor <branch> main`, then `git branch -D <branch>`
10. Confirm the deploy: on the merge commit, `ci` and the Vercel status are green (`gh api repos/{owner}/{repo}/commits/<sha>/check-runs` and `.../status`). A failed Vercel build keeps the previous deployment live; report it with the reason
