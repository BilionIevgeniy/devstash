# Current Feature: Fix Create Item Dialog

## Status

In Progress

## Goals

- `CreateItemDialog` cannot be closed by Esc, an overlay click or the X while a create is running, so a failure keeps the user's input, no false "created" toast shows later and the form cannot be sent twice
- A rejected `createItem` (the network drops) shows an error toast and keeps the form open, instead of reaching the root error page
- A signed-out caller's redirect still goes through, with no error toast

## Notes

- Same approach as `CreateCollectionDialog`: `useTransition` moves up into the dialog and is passed to the form, `handleOpenChange` blocks closing while `isCreating` is true, the await is in `try/catch` with `unstable_rethrow`
- Only `src/features/items/components/CreateItemDialog.tsx` changes; `createItem` stays as it is
- Remove the entry from `context/todo.md` once fixed (the file has the skip-worktree flag, so it stays local)
- Browser checks: Esc, overlay and X during a throttled submit; offline submit; submit after signing out in another tab; closing while a file upload runs but before submit still aborts it

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
