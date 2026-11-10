# Complete Action

1. Run `npm run test`, `npm run typecheck`, `npm run lint` and `npm run build`; stop and fix if anything is not green
2. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals and Notes sections (keep placeholder comments)
   - Add feature summary to the END of context/feature-history.md (not to current-feature.md)
3. Read context/todo.md and check it against what this feature built:
   - Delete each item the feature finished
   - Shorten an item the feature finished in part, so it says only what is left
   - Keep anything not clearly done, and name the deleted items in the final message

4. Stage all changes and commit with a descriptive message

5. Switch to main and merge the feature branch (no push yet)

6. Delete the local feature branch

7. Push main to origin ONCE (single push with all changes)

8. If feature branch was previously pushed, delete it from origin
