# 0031. Custom item types: a slug fixed at creation, a fixed palette, owner-scoped lookups

- Status: accepted
- Date: 2026-11-18

## Context

The homepage sold "Custom item types" under Pro, marked "coming soon". `ItemType` already had `userId`, `isSystem`, `icon` and `color`, and every user shared the seven system types. Several things depended on a type being a system type:

- The URL of a type page was derived from the type's name (`snippets`). A name the user chooses changes, so the URL changes with it, and bookmarks break.
- A type was looked up by name with no owner. With custom types, a lookup without the owner would hand out another user's type.
- The field rules of an item (content, language, URL, upload) were keyed by the system names.
- `/pinned` read one first page per type, seven reads. With custom types that number grows.
- The export and import knew only the system types.

Feature 18 builds custom types for Pro users. It also contracts the expand step of feature 17: the columns `@ignore`d there are dropped in their own first migration. After this deploy, an Instant Rollback to any deployment before feature 17 is no longer possible, because those deployments select the dropped columns.

## Decision

### Slug

- Every type has `ItemType.slug`, unique per owner (`@@unique([userId, slug])`). The system types got theirs in the migration that added the column: the old URL segment, the name plus "s".
- A custom type's slug is made from its name when the type is created and never changes:
  - accents are dropped, the name is lower-cased, and every run of other characters becomes one dash;
  - it is at most 40 characters;
  - it is `type` for a name with no Latin letter;
  - `-2`, `-3`, … are added past the user's own slugs.
- A rename changes the name only, so the URLs of the type and of its items keep working.
- A system type has no `userId`, and a NULL makes every row distinct, so the index cannot keep a custom slug off a system slug. The domain does it instead: the system names and slugs are reserved (`item-types/domain/custom-type.ts`).

### Names

- A custom type never takes a system type's name, in any case (`isReservedTypeName`). This is why a name alone tells the field rules and the lookup which kind of type it is.
- Two types of one user never share a name in any case.
- Look-alikes ("Snippets", "Befehle") are allowed on purpose. Reserving the visible labels would copy the English and German message texts into `domain/`, a second source that drifts when a label changes, and the name is the user's choice. The palette includes the system colors and icons, so the sidebar can show two rows that look the same.

### Lookups

Every lookup takes the caller:

- `getUserItemTypeByName` finds a system type by its exact name, else the caller's own type in any case.
- `getItemTypeBySlug`, `getItemTypesById`, `getSidebarItemTypes` and `getCustomTypes` are scoped the same way.

The create of an item resolves its type through `getUserItemTypeByName`, so nobody can create an item of another user's type. The integration tests of `item-types`, `items` and `import-export` prove it with two users.

### Writes

- The Pro check is in the service (`getEntitlements`), not only in the interface.
- A create and an update take an advisory lock per user, so the cap and the name check see rows no parallel write can change. The cap is 50 types per user, an abuse bound far above real use.
- A delete is one statement. The foreign key of `Item.typeId` (`NoAction`) refuses a type that still has items, mapped to `typeHasItems`. An item created in parallel can therefore never be orphaned, and no read is needed.
- A delete has no Pro check, so a former Pro user can always clean up. Feature 19 decides what a downgrade does to the types themselves; until then a former Pro user keeps them, and their items stay usable.

### Color and icon

A fixed palette of twelve hex values (`TYPE_COLORS`: the seven system colors and five more) and the icon set of the system types (`TYPE_ICON_NAMES`, which also types the map of `TypeIcon`). The schema refuses any other value.

The colors are hex values in the list, not CSS tokens. Every type color, the system types' included, is rendered from `ItemType.color` through `style`, in about twenty components. A token would mean rewriting all of them and the system rows. A type's color is data that no class can name, so it is the second exception to "No inline styles" in `coding-standards.md`.

A color is never removed from the list: a type that stores it would fail the schema on an edit that does not touch the color.

### Content

A custom type is a text type, like a snippet: content in the code editor and its language, plaintext by default. Explain Code shows for it.

The spec asked for content and language. The language means something only in the code editor, so a Markdown editor would leave it with nothing to do. File-backed custom types and custom fields are not built.

### Where it shows

- The sidebar lists the system types in their order, then the user's own by name, with counts.
- Each custom type has its page `/items/<slug>` with its own New button. The create dialog offers the custom types after the system ones.
- The dashboard, the collection type ranking, the palette and the profile read the same owner-scoped queries.
- The settings page has the `CustomTypesSection`:
  - a Free user with no types sees the upgrade;
  - a former Pro user sees the list and can delete, not create or edit.

### `/pinned` in one ranked read

`items/_internal/queries/pinned-first-pages.ts` ranks every type's pins at once:

- `ROW_NUMBER()` and `COUNT(*) OVER (PARTITION BY "typeId")` give each type its first page plus one row and its count.
- A second read fetches those rows by id, with the owner.
- The count and whether more rows follow come from the ranked read, so a pin removed between the two reads only shortens its page.
- The order of each sort is a fixed `Prisma.sql` fragment with the same keys as `pinnedKeyset`. A test checks for every sort that the first page and cursor match a read of the group alone.

Prisma cannot take N rows per group, so this file joins the two search-ranking files of ADR 0018 as the only places allowed to call `prisma.$queryRaw` (the tagged template; `Prisma.raw` stays banned). The exception names the file in `eslint.config.mjs`.

### Export and import (ADR 0019, ADR 0020)

- The export writes the user's custom types in a `types` list of version 1: name, icon and color, with no id and no slug, which belong to the importing account. Each item's `type` stays the type's name.
- A file without `types` imports as before.
- The import sends the types first (`importTypes`):
  - a type the account has by name, in any case, counts as already there;
  - a missing one is created through `createCustomType`, so the cap and the rules apply.
- The items then find their type by name. An item of a type the importer lacks is refused with `invalidItemType`, even when another user has a type of that name.
- The duplicate key compares the type name in lower case.

## Consequences

- A rename never breaks a URL. A deleted and recreated type gets the slug again only if it is free.
- Two rows can look alike in the sidebar when a user names a type like a system type in another form.
- One more raw SQL file to review by hand. Its fragments are fixed and its values are parameters.
- The import rate limit counts the extra batch of types (`IMPORT_MAX_BATCHES`, 251).
- No Instant Rollback to a deployment before feature 17 from here on.
