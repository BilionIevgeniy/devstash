# Current Feature: Create Collection

## Status

In Progress

## Goals

- A "New collection" button in the top bar, next to "New item", opens a modal
- The modal has a required name and an optional description. It shows a `Creating…` pending state and cannot be submitted twice
- Collections are created for the signed-in user only, with the `userId` taken from the session
- A success toast appears only after the modal has closed. On failure, an error toast appears and the modal stays open with the user's input
- After saving, the new collection appears without a reload in the sidebar, the dashboard's recent collections and the stats cards

## Notes

- Files, mirroring items:
  - `collections/domain/collection-fields.ts`: length limits
  - `collections/schemas.ts`: `createCollectionSchema`, with a test covering a blank name, values at and over the limits, a blank description becoming null and a stray `userId` being stripped
  - `collections/services/collection.ts`: `createUserCollection`, no test (it has no decision to pin)
  - `collections/actions/collection.ts`
  - `collections/components/CreateCollectionDialog.tsx`
  - These stay public like `items`: `collections` claims the code, so rule 9 does not apply
- Limits: `NAME_MAX = 200`, `DESCRIPTION_MAX = 2_000`, matching the item limits
- Refreshing the page: the action calls `refresh()` as `createItem` does, and the sidebar, dashboard and stats all re-read through their existing queries. The toast uses the same `onCloseAutoFocus` timing as `CreateItemDialog`, and the second `startCreating(onCreated)` wrap after the await is required for it
- Dialog: `useTransition` lives in `CreateCollectionDialog`, and closing (Esc, overlay, X) is blocked while `isCreating` is true. A private `CreateCollectionForm` unmounts on close and keeps one `values` object. The dialog has a title and description, the inputs have `maxLength`, and submit is disabled on a blank name
- A rejected action would reach the root error page, since the dialog sits above `(app)/error.tsx`: the await is wrapped in `try/catch` with `unstable_rethrow`, so a signed-out redirect still goes through
- Top bar: `TopBar` imports `CreateCollectionDialog` directly (no props, so no slot). `ml-auto` moves to a wrapper around both buttons. New collection sits left of New item, with `variant="outline"`
- Small screens: the new button's label is `hidden sm:inline`, with an `aria-label` at all widths
- Form fields: `Field` moves to `src/components/common/Field.tsx`, shared by `items` and `collections`
- `CollectionCard`: `min-h-5` on the description `<p>`, so a collection with no description keeps the skeleton's height
- Docs: update `docs/modules.md`: collections (Owns, Uses today with `auth`, entry points), app-shell, and the items Private list
- Accepted gap: cards and the sidebar link to `/collections/[id]`, which 404s until the collections pages are built
- Browser checks: Esc, overlay and X during a throttled submit; offline submit; submit after signing out in another tab; toast timing against the refreshed lists; focus return to the icon-only trigger; 320px width; card height with no description
- Server Action, not an API route: creating a collection is a form mutation, which `coding-standards.md` puts in Server Actions, and `createItem` is one too. The feature has no client-side reads, so it needs no route
- No 3-collection Free limit: `billing/domain/limits.ts` has no count limits yet, and `docs/modules.md` assigns them to the Stripe specs
- Duplicate names are allowed: the schema has no unique constraint

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
