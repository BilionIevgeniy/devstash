# Current Feature: Item Create

## Status

In Progress

## Goals

- "New Item" button in the top bar opens a shadcn Dialog to create an item
- Type selector: snippet, prompt, command, note, link
- Fields depend on the selected type:
  - all types: title (required), description, tags
  - snippet/command: content, language
  - prompt/note: content
  - link: URL (required)
- Server Action `createItem` in `items/actions/item.ts`: parses with a Zod schema from `items/schemas.ts`, makes one service call, returns `ActionResult`
- Service `createUserItem(userId, input)` in `items/services/item.ts` does the write
- On success: toast, close the dialog, refresh

## Notes

- Spec adapted under ADR 0003 (course had a `createItem` query in `lib/db/items.ts`)
- Reuse from the edit drawer: `editableFields()` and `parseTagInput()` in `items/domain/item-fields.ts`, the `updateItemSchema` shape in `schemas.ts` (the create schema likely shares its fields, plus the type and a URL that is required for links), and the `updateUserItem` / `updateItem` patterns
- The "New Item" button lives in `app-shell/_internal/components/TopBar.tsx`. `app-shell` (rank 9) may import from `items` (rank 5), so the dialog goes in `items/components/` (it is consumed outside the feature)
- The type selector needs the system type ids: get them through `item-types` (rank 3) queries/services, never by reading `ItemType` from `items`
- Tests: the new schema rules and the service decision (`schemas.test.ts`, `services/item.test.ts`)
- Free-tier limits (50 items) are not in this spec and stay out until `billing` exists

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
