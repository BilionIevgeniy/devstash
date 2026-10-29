# Current Feature: Delete Item

## Status

In Progress

## Goals

- The Delete (trash) button in the drawer's `items/_internal/components/ItemActionBar.tsx` opens a shadcn `AlertDialog` asking to confirm: it names the item, says the deletion cannot be undone, and has Cancel and a destructive Delete button
- The button is enabled only once the item's detail has loaded, like Edit
- On confirm, a new `deleteItem(itemId)` Server Action in `items/actions/item.ts` parses the id with `itemIdSchema`, calls `getSessionUser()` outside the try and makes one call into a new `deleteUserItem(userId, itemId)` in `items/services/item.ts`; it returns `ActionResult`
- The service deletes with `where: { id, userId }`, so a foreign item cannot be deleted, and maps P2025 to "Item not found"; the `ItemTag` and `ItemCollection` rows go with the item through `onDelete: Cascade`
- On success the drawer closes, a toast says "Item deleted" and `router.refresh()` removes the card from the list; on failure an error toast shows and the drawer stays open
- While the request runs, the confirm button is disabled so it cannot be clicked twice
- New service tests: the delete is scoped by `userId`, P2025 becomes "Item not found", and the success result; the thin action is not tested, per the standards

## Notes

- The dialog follows the existing `auth/components/DeleteAccountDialog.tsx`; `alert-dialog` and `sonner` are already installed, and `ItemEditForm` already uses toasts
- The provider already keeps a ref of the open item's id: it makes sure a delete that finishes after another card was opened does not close that other card
- Deferred: removing tags no item uses any more, deleting from the card itself (outside the drawer), and undo

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
