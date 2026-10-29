# Current Feature: Item Drawer — Edit Mode

## Status

In Progress

## Goals

- The pencil button switches the open drawer to edit mode in place; the action bar becomes Save and Cancel
- Cancel throws away the changes and goes back to view mode
- Save stores the changes, goes back to view mode and shows the new data; a toast reports success or the error
- Editable on every item: title (required), description, tags (typed comma-separated, saved as a list)
- Editable only on some types: content (snippet, prompt, command, note), language (snippet, command), url (link)
- Shown but not editable: item type, collections, created/updated dates
- Zod update schema in `items/schemas.ts`: title trimmed and not empty; description, content, language string or null, optional; url a valid URL or null; tags a list of trimmed, non-empty strings
- `updateItem(itemId, data)` in `items/actions/item.ts` returns `ActionResult`: checks the input with the schema, gets the user from `getSessionUser()`, makes one call to `updateUserItem(userId, input)`
- `updateUserItem` in `items/services/item.ts` updates the item only if this user owns it (any other id answers not found), removes all of the item's tags and connects or creates the new ones, and returns the updated `ItemDetail` so the drawer doesn't fetch again
- After saving, `router.refresh()` updates the card list behind the drawer

## Notes

- No form library: plain controlled inputs with local state; Save is disabled while the title is empty
- Zod on the server decides what is valid; its errors come back in `{ success: false, error }`
- Content is a plain textarea, not a code editor (that comes later)
- Ownership is checked in the service, per ADR 0003 (the course used `auth()` plus a function in `lib/db`)
- Tests: the new schema, and `updateUserItem` with Prisma mocked (ownership check and tag replacement)
- Spec: `context/features/item-drawer-edit-spec.md`

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
