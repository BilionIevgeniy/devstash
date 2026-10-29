# Item Drawer — Edit Mode

> Adapted to our architecture (paths: `context/architecture-rules.md`, "Old paths in specs"). The course wording is kept in `/Users/ievgenbilion/Programming/Projects/Devstash/featuresDRAFT.original/`. Changed requirements are marked `[changed: ...]`.

## Overview

Clicking the Edit button (pencil icon) in the item drawer's action bar switches from view mode to edit mode inline. The same drawer stays open — fields become editable inputs.

## Requirements

### Mode Toggle

- Edit button toggles the drawer into edit mode
- In edit mode, the action bar is replaced with Save and Cancel buttons
- Cancel discards changes and returns to view mode
- Save persists changes via server action, returns to view mode, and refreshes the drawer data
- Toast notification on save success or error

### Editable Fields

All types:

- **Title** — text input, required
- **Description** — textarea, optional
- **Tags** — comma-separated text input that converts to tag array on save

Type-specific (only show for the relevant item type):

| Field        | Shown for                      | Input type |
| ------------ | ------------------------------ | ---------- |
| **Content**  | snippet, prompt, command, note | textarea   |
| **Language** | snippet, command               | text input |
| **URL**      | link                           | text input |

### Non-Editable (display only in edit mode)

- Item type (snippet, prompt, etc.) — cannot be changed
- Collections — will be managed separately
- Created/Updated dates

## Validation

Zod schema for the update payload (per coding standards). Validate in the server action before hitting the database.

- `title` — non-empty string, trimmed
- `description` — string or null, optional
- `content` — string or null, optional
- `url` — valid URL string or null, optional
- `language` — string or null, optional
- `tags` — array of trimmed non-empty strings

Return Zod errors in the `{ success: false, error }` response so the client can display them.

## Server Action

`updateItem(itemId, data)` in `items/actions/item.ts` following the `{ success, data, error }` return pattern (`ActionResult`). Validates input with Zod (`items/schemas.ts`), reads the user with `getSessionUser()`, and makes one call into `updateUserItem(userId, input)` in `items/services/item.ts`, which writes with the owner in the `where`; a foreign id answers not found `[changed: ADR 0003, course: auth() in the action and a query function in lib/db/items.ts]`.

## Data

- Write function `updateUserItem` in `items/services/item.ts`; the drawer reads the item with `getItemDetail(userId, id)` in `items/queries.ts`
- Tag handling on update: disconnect all existing tags, connect-or-create new ones
- Returns updated `ItemDetail` so the drawer can refresh without a second fetch

## Notes

- Keep it simple — no form library needed, use controlled inputs with local state
- Client-side: disable Save button when title is empty (basic UX guard)
- Server-side: Zod validates all fields in the server action (source of truth)
- The content textarea doesn't need to be a code editor — that comes later
- After save, call `router.refresh()` so the underlying card list reflects changes
