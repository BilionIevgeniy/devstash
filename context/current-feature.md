# Current Feature

Refactor: split large components and set size limits

## Status

In Progress

## Goals

- Split the six places over the size limits, with no change in behaviour:
  - `files/components/FileUpload.tsx`: `useFileUpload` hook, `put-file.ts`, `UploadProgress`, `DropZone`
  - `items/components/CreateItemDialog.tsx` and `items/_internal/components/ItemEditForm.tsx`: shared `ItemFields`, `ItemTypeSelect`, `useUnsavedChanges`, one state object each
  - `items/_internal/components/ItemDrawerContent.tsx`: `ItemDrawerHeader`, `ItemBody`, `ItemMeta`, `DrawerSection`
  - `items/components/ItemDrawerProvider.tsx` and `ItemRouteDrawer.tsx`: shared `useDirtyCloseGuard`, `useItemSheet`
  - `account/components/DeleteAccountDialog.tsx`: private `ConfirmPasswordField`
- Pure `typeFieldValues` in `items/domain/item-changes.ts` with its test, used by both forms
- Size limits in `context/coding-standards.md`, enforced by ESLint (`max-lines-per-function`, `max-lines`, `complexity`)
- Hooks and browser helpers documented as part of the `components/` role; `docs/modules.md` Private lines updated
- ADR 0007: hooks live in `components/hooks/` (decided by `architecture-reviewer` over a `hooks/` role); a hook never imports a `.tsx` (new lint zone); browser helpers start with `import "client-only"` (`client-only` added to `package.json`); `components/common` falls under the Prisma ban; feature-neutral hooks go to `src/components/common/hooks/` when one is needed

## Notes

- Limits are counted without blank lines and comments: 50 lines per function in `domain/`, `services/`, `queries.ts`, `actions/`, `lib/` and routes; 80 in `components/` (including `use-*.ts` hooks) and pages; 250 per file; cyclomatic complexity 15
- Reviewed by `architecture-reviewer`: all 11 findings taken (limits by role, `useItemSheet` owns `isOpen` and the abort, the guard forwards `open = true`, function updates for the form state, no `disabled` on `ItemFields`, `startPut` silent on abort, docs updates, key-absence tests)
- Browser checks (user): create every type; upload, Retry, Cancel (no error flash); switch type and close the dialog during an upload; dirty edit: reload prompt, Esc/overlay/X in the sheet and the route drawer, Discard returns focus to the card; open another card during a save; fast typing and paste in Monaco; delete an item; delete the account

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
