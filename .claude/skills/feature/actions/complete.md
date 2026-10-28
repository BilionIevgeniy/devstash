# Complete Action

1. Run `npm run test`, `npx tsc --noEmit`, `npm run lint` and `npm run build`; stop and fix if anything is not green
2. Stage all changes and commit with a descriptive message
3. Switch to main and merge the feature branch (no push yet)
4. Delete the local feature branch
5. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals and Notes sections (keep placeholder comments)
   - Add feature summary to the END of context/feature-history.md (not to current-feature.md)
6. Commit the reset: `chore: reset current-feature.md after completing [feature]`
7. Push main to origin ONCE (single push with all changes)
8. If feature branch was previously pushed, delete it from origin
