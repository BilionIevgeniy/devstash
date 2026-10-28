# Item types

The seven system item types of DevStash: what each one is, how it looks, and which `Item` fields it uses. Sources: `prisma/schema.prisma`, `prisma/seed-data.ts`, `src/features/item-types/`, `src/features/items/` and the sidebar in `src/features/app-shell/`.

Status of this document: it describes what the code and the seed do today. Things that are planned but not built are marked **Planned** and collected in the last section.

## How types are stored

A type is a row in `ItemType` (`name`, `icon`, `color`, `isSystem`, `userId`). The seven system types are seeded by `prisma/seed.ts` from `systemItemTypes` in `prisma/seed-data.ts`, with `isSystem = true` and `userId = null`. Custom types (Pro) would be rows with `isSystem = false` and a `userId`; no code creates them yet.

- `icon` is the name of a lucide icon. `TypeIcon` (`src/features/item-types/components/TypeIcon.tsx`) maps the name to the component and falls back to `File` for an unknown name.
- `color` is a hex string. It is applied through inline `style` (icon color, left border of `ItemRow` and `ItemCard`, icon background mixed at 10%).
- The sidebar and the usage stats list system types in a fixed order set by `SYSTEM_TYPE_ORDER` in `src/features/item-types/domain/item-type.ts`: snippet, prompt, command, note, file, image, link.
- The type `name` is lowercase and singular. The UI builds the label and the route by appending `s` (`snippets`, `/items/snippets`). `typeSlug` and `parseTypeSlug` in `domain/item-type.ts` do this in both directions, so the sidebar and the page share one rule.

## The seven types

| Type    | Icon (lucide) | Color     | Content class | Purpose                                                       | Key fields                                         |
| ------- | ------------- | --------- | ------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| snippet | `Code`        | `#3b82f6` | text          | Reusable code, with syntax highlighting                       | `content`, `language`                              |
| prompt  | `Sparkles`    | `#8b5cf6` | text          | AI prompts and workflows                                      | `content`                                          |
| command | `Terminal`    | `#f97316` | text          | Shell and CLI commands                                        | `content`, `language` (`bash` in the seed)         |
| note    | `StickyNote`  | `#fde047` | text          | Free-form notes, templates and docs; markdown                 | `content`, `language` (`markdown` in the seed)     |
| file    | `File`        | `#6b7280` | file          | Uploaded documents, context files, templates (Pro)            | `fileUrl`, `fileName`, `fileSize`                  |
| image   | `Image`       | `#ec4899` | file          | Uploaded images (Pro)                                         | `fileUrl`, `fileName`, `fileSize`                  |
| link    | `Link`        | `#10b981` | URL           | Bookmarks and references to web pages                         | `url`                                              |

Notes per type:

- **snippet.** Seed values for `language` are `typescript` and `yaml`. The only type where `language` is expected on every item.
- **prompt.** `language` is `null` in the seed. Prompts are plain text.
- **command.** `language` is `bash` in the seed. Content is a single command line in the seed items.
- **note.** The seed note is a markdown template, so `language` is `markdown`. The project overview plans a markdown editor for text items.
- **file / image.** The schema has the fields for them and the project overview lists uploads to Cloudflare R2, but there is no upload code, and the dev database holds no file or image items. The sidebar shows a PRO badge next to both.
- **link.** The seed link has `contentType = "URL"`, `content = null` and `url` set. This is the only type that uses `url`.

Item counts in the development database at the time of writing: snippet 5, command 3, prompt 2, note 1, link 1, file 0, image 0.

## Classification: text vs file vs URL

`Item.contentType` is a plain `String`. The schema has no enum and no constraint, and the project overview draft describes it as `text | file`.

| Class | `contentType` in use | Types                                 | Fields filled                                | Fields empty                       |
| ----- | -------------------- | ------------------------------------- | -------------------------------------------- | ---------------------------------- |
| text  | `TEXT`               | snippet, prompt, command, note        | `content`, optionally `language`             | `url`, `fileUrl`, `fileName`, `fileSize` |
| URL   | `URL`                | link                                  | `url`                                        | `content`, file fields             |
| file  | none yet             | file, image                           | `fileUrl`, `fileName`, `fileSize`            | `content`, `url`                   |

`TEXT` and `URL` are the only values that exist in the seed and the database. The value for the file class is not defined anywhere: neither the schema, the seed type (`"TEXT" | "URL"` in `SeedItem`) nor any code mentions it. See "Planned" below.

## Shared properties

Every item, whatever its type, has these fields (`Item` in `prisma/schema.prisma`):

- `title` (required), `description`
- `isFavorite`, `isPinned`
- `typeId` pointing to the `ItemType` (`onDelete: NoAction`, so a type that has items cannot be deleted)
- `userId` (owner; every query is scoped by it)
- tags through `ItemTag`, collections through `ItemCollection` (many-to-many, so a collection can mix types)
- `createdAt`, `updatedAt`

The three content groups from the previous section are the only fields that differ between types: `content` + `language`, `url`, and `fileUrl` + `fileName` + `fileSize`.

## Display differences

Today the type changes only the icon and the color. Nothing else in the UI depends on the type.

- **`ItemRow`** (dashboard, pinned and recent lists) renders every type the same way: title, pin and star marks, description, tags, date. The type shows as the lucide icon in its color, a tinted icon background and a 4px left border in the type color. It does not render `content`, `language`, `url` or file data.
- **`ItemCard`** (`/items/{name}s`, in a two-column grid from the `md` breakpoint) shows the same fields as `ItemRow`, laid out as a card with the same type icon and 4px left border in the type color.
- **Sidebar "Types"** lists the seven types in `SYSTEM_TYPE_ORDER` with icon, plural label, item count and a PRO badge on `file` and `image`. The badge comes from a hardcoded `PRO_TYPE_NAMES` list in the sidebar component, not from a limit or entitlement check. Each entry links to `/items/{name}s`, built with `typeSlug`.
- **Profile usage stats** list the same types with icon and count.
- **Collection cards and the sidebar collections** take their accent color and icons from the types of the items inside: `rankTypesByUsage` orders a collection's types by item count (ties by name), and the first one gives the accent color.

## Planned or not built yet

These are the gaps found while researching, to keep the document honest:

- **Type pages only list.** `/items/{name}s` shows the user's items of one type as cards, newest first, with no pagination and no search. The cards are not links: there is no detail view, drawer or editing yet.
- **No per-type rendering or editing.** A syntax-highlighted view for snippets and commands, a markdown editor for notes, a link view and an image preview are described in the project overview but do not exist.
- **No value for the file class of `contentType`.** Decide it together with the upload feature (`files`), and consider an enum or a Zod/domain constant so the three classes cannot drift.
- **No Pro gating.** The PRO badge is cosmetic. Free-tier limits and Pro-only types (file, image, custom types) belong in `billing` once it exists.
- **No custom types.** The schema supports them (`isSystem = false`, `userId`), but `getSidebarItemTypes` selects only `isSystem: true` types, so a user's own types would not show in the sidebar.
- **Naming.** The research prompt says "link", the project overview says "URL". The database name is `link`; `URL` is the content class of that type.
