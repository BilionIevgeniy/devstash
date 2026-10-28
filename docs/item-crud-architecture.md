# Item CRUD architecture

A design for create, read, update and delete of items, one system for all seven item types. Sources: [project-overview.md](../context/project-overview.md), [item-types.md](item-types.md), `prisma/schema.prisma`, the code in `src/`, and the rules in [coding-standards.md](../context/coding-standards.md), which win wherever this guide disagrees with them.

**Status: a proposal. Nothing below is built yet.** Today `features/items` holds `ItemRow`, three dashboard reads (`getPinnedItems`, `getRecentItems`, `getItemStats`) and view types. There is no `/items/...` route, no item action, no service and no schema, although the sidebar already links to `/items/{name}s`.

## The idea in one minute

- **One route, one drawer, one form.** `/items/[type]` lists the items of a type. A single drawer shows one item. A single form creates and edits. None of them is written per type.
- **Seven types, three classes.** The types differ in which columns they fill: text (snippet, prompt, command, note), URL (link), file (file, image). Components and validation adapt to the class, so a new type of an existing class costs a seed row, not code.
- **Actions do not know types.** Mutations live in one file, `actions/item.ts`, parse one schema and make one call into a service. Type-specific behaviour is in components (what is shown and asked) and in one pure mapping (which columns a class stores).
- **Reads are plain queries** called by server components, scoped by `userId`.
- **The standard's layers apply unchanged:** action, then service, then Prisma; no Prisma in actions or components; `items` imports only lower ranks.

## Content classes

Recap of [item-types.md](item-types.md). The class decides the shape of the data; the type decides the label, icon, color and how the content is rendered.

| Class | Types                          | `Item` columns used                   | `contentType` column |
| ----- | ------------------------------ | ------------------------------------- | -------------------- |
| text  | snippet, prompt, command, note | `content`, `language` (optional)      | `TEXT`               |
| url   | link                           | `url`                                 | `URL`                |
| file  | file, image                    | `fileUrl`, `fileName`, `fileSize`     | `FILE` (proposed)    |

`FILE` is not defined anywhere today; see "Open decisions". The mapping type to class is pure data and lives in `item-types/domain/item-type.ts`, next to `SYSTEM_TYPE_ORDER`, because both `items` (rank 6) and its schemas need it and `item-types` (rank 4) is the lowest feature that can own it.

## File structure

New files are marked `+`; changes to existing files are marked `~`.

```text
src/
  app/(app)/
    items/[type]/
      + page.tsx                  resolves the slug and ?item, composes the header, the list and the drawer
    dashboard/page.tsx            ~ also mounts <ItemDrawer> for ?item (the mockup opens it from the dashboard)
  proxy.ts                        ~ matcher gains "/items/:path*"
  features/
    item-types/
      domain/item-type.ts         ~ + typeSlug, parseTypeSlug, CONTENT_CLASS_BY_TYPE, getContentClass
      queries.ts                  ~ + getItemTypeByName(name)
    items/
      domain/
        + limits.ts               TITLE_MAX_LENGTH, DESCRIPTION_MAX_LENGTH, CONTENT_MAX_LENGTH, MAX_TAGS, ...
        + item-fields.ts          pickFieldsForClass(class, input): the columns a class stores, the rest null
        + tags.ts                 normalizeTags(names): trim, lowercase, dedupe
      + schemas.ts                itemFormSchema (union by class), itemFlagsSchema, itemParamsSchema (?item)
      ~ types.ts                  + ItemDetail, ItemFormValues, ItemContentClass
      ~ queries.ts                + getItemsByType, getItemDetail
      + services/item.ts          createUserItem, updateUserItem, deleteUserItem
      + actions/item.ts           createItem, updateItem, deleteItem      <- all mutations, one file
      components/                 public: used by app/ and app-shell
        ItemRow.tsx               ~ becomes a link to ?item=<id>
        + ItemList.tsx
        + ItemDrawer.tsx          server component: reads ?item, calls getItemDetail
        + NewItemSheet.tsx        client: the create form in a sheet, opened by the top bar
      _internal/components/       private to items
        + ItemDrawerShell.tsx     client: the Sheet, open state, closing removes ?item
        + ItemDetail.tsx          server: header, content by class, tags, collections, dates
        + ItemActions.tsx         client: favorite, pin, copy, edit, delete
        + ItemForm.tsx            client: create and edit, fields by class
        + DeleteItemDialog.tsx    client: confirmation (uses ui/alert-dialog)
        + content/                TextContent, UrlContent, FileContent
        + fields/                 TextFields, UrlFields, FileFields
```

`ItemList`, `ItemDrawer` and `NewItemSheet` are public because a page or the shell imports them. Everything else is private to the feature, in line with "Public API of a feature". No `index.ts` files.

## Routing: `/items/[type]`

| URL                             | Shows                                                    |
| ------------------------------- | -------------------------------------------------------- |
| `/items/snippets`               | the user's snippets                                      |
| `/items/snippets?item=<id>`     | the same list with the drawer open on that item          |
| `/items/widgets`                | 404 (`notFound()`): not a known type                     |

The segment is the **plural slug**, because `TypesSection` already links to `/items/${type.name}s`. One function builds the slug and one parses it, both in `item-types/domain/item-type.ts`, so the sidebar and the page cannot drift apart (`TypesSection` should switch to `typeSlug(name)` in the same change).

Resolution in the page, following the Next.js 16 conventions in `node_modules/next/dist/docs` (`params` and `searchParams` are Promises; `PageProps` is a global helper, like the `LayoutProps<"/">` already used in `(app)/layout.tsx`):

```tsx
export default async function ItemsPage({
  params,
  searchParams,
}: PageProps<"/items/[type]">) {
  const { type: slug } = await params;
  const typeName = parseTypeSlug(slug);
  if (!typeName) notFound();

  const { id: userId } = await getSessionUser();
  const type = await getItemTypeByName(typeName);
  if (!type) notFound();

  const { item: itemId } = itemParamsSchema.parse(await searchParams);
  // header, <ItemList items={await getItemsByType(userId, type.id)} />, <ItemDrawer itemId={itemId} />
}
```

- **Rendering.** `(app)/layout.tsx` is `force-dynamic` and the page reads `searchParams`, so everything renders per request and `params` needs no `<Suspense>`. `generateStaticParams` is not used: the page is per-user and authenticated.
- **Auth.** The `(app)` group has no guard of its own: `src/proxy.ts` redirects signed-out visitors, and its `matcher` is `["/dashboard/:path*", "/profile/:path*"]`. It must be widened to include `/items/:path*` in the same change as the route.
- **`?item` is parsed with Zod** (`itemParamsSchema` in `schemas.ts`, as the standard asks for `searchParams`). A malformed value is dropped, not an error.
- **The drawer is not tied to the type.** `getItemDetail(userId, id)` looks the item up by owner and id only, so the same `<ItemDrawer>` works on the dashboard and on any type page. An `?item` that belongs to another user, or to nobody, renders no drawer.
- **Why a search param and not `/items/[type]/[id]`.** The drawer sits over the list in the mockup (`context/screenshots/dashboard-ui-drawer.png`), the list should not unmount, and a search param keeps the read in a server component. The cost is that the drawer is a state of the URL, not a page of its own.

## Read path

Data is fetched in server components through `queries.ts`; nothing is fetched from the client.

| Query                                | Feature      | Returns                          | Used by                          |
| ------------------------------------ | ------------ | -------------------------------- | -------------------------------- |
| `getItemTypeByName(name)`            | `item-types` | `ItemTypeInfo \| null`           | the page (slug to type)          |
| `getItemsByType(userId, typeId)`     | `items`      | `DashboardItem[]`                | `ItemList`                       |
| `getItemDetail(userId, id)`          | `items`      | `ItemDetail \| null`             | `ItemDrawer`                     |

- The list reuses the existing `dashboardItemSelect` and `toDashboardItem`, so a row carries no `content`. Only the detail query loads content, which keeps lists light.
- `ItemDetail` carries `contentType`, `content`, `language`, `url`, the file columns, both flags, both dates, `type: ItemTypeInfo`, `tags: string[]` and `collections: { id; name }[]`. The collections come from a relation `select` on `ItemCollection`, a read, not an import of the `collections` feature.
- `getItemTypeByName` today finds system types only (`isSystem: true`), matching `getSidebarItemTypes`. Custom types (Pro) would add `OR userId = <user>`; that is why the page passes the type through a query instead of a constant list.
- A missing or foreign row is `null`, never an error: "a foreign id answers not found".

## Write path

One action file, one service file. Each action does the same five things: parse, authenticate, call one service, revalidate, return `ActionResult`.

```text
ItemForm / ItemActions / DeleteItemDialog          client components
  -> createItem | updateItem | deleteItem          items/actions/item.ts      "use server", the entry point
     -> itemFormSchema / itemFlagsSchema           items/schemas.ts           shape of the input, by class
     -> getSessionUser()                           auth/nextauth/session.ts   outside the try block: it redirects by throwing
     -> createUserItem | updateUserItem | deleteUserItem
                                                   items/services/item.ts     the only call the action makes
        -> getContentClass(type.name)              item-types/domain          class of the type
        -> pickFieldsForClass, normalizeTags       items/domain               pure
        -> prisma (transaction)                    owner in every where
     -> revalidatePath("/", "layout")              the action, not the service
```

| Action                  | Input                                             | Result                       | Service work |
| ----------------------- | ------------------------------------------------- | ---------------------------- | ------------ |
| `createItem(input)`     | `typeId` + form fields of the type's class        | `ActionResult<{ id: string }>` | load the type (system or the user's own); check the class matches; (limit check goes here); insert the item with `connectOrCreate` tags in one transaction |
| `updateItem(id, input)` | the form fields, **or** `{ isFavorite?, isPinned? }` | `ActionResult`            | prove ownership with `findFirst({ id, userId })` in the transaction; write the columns of the class; replace the tag set. The flags variant is a single `updateMany({ id, userId })` and `count === 0` means not found |
| `deleteItem(id)`        | `id`                                              | `ActionResult`               | `deleteMany({ id, userId })`; `count === 0` means not found. `ItemTag` and `ItemCollection` rows go through `onDelete: Cascade` |

Rules that follow from the standard:

- Services take `userId` as a parameter and return `OperationResult`; create returns `ActionResult<{ id: string }>`, which extends it. Expected failures (not found, class mismatch, limit) are results; anything else throws and is caught in the action, which logs it and returns a generic message, as `auth/_internal/actions/account.ts` does.
- Actions and components never import Prisma. Services never import `next/cache`, which is why `revalidatePath` is in the action.
- The action file stays thin. If it passes about 300 lines, split by topic, not by type.

### Input schema

The schema is the one place where the three classes show up on the server. It validates shape; it is not a type switch. It composes the constants of `domain/limits.ts` instead of repeating them.

```ts
const baseFields = {
  title: z.string().trim().min(1, "Title is required").max(TITLE_MAX_LENGTH),
  description: z.string().trim().max(DESCRIPTION_MAX_LENGTH).optional(),
  tags: z.array(z.string()).max(MAX_TAGS).default([]),
};

export const itemFormSchema = z.discriminatedUnion("contentClass", [
  z.object({ ...baseFields, contentClass: z.literal("text"),
    content: z.string().min(1).max(CONTENT_MAX_LENGTH),
    language: z.string().trim().max(LANGUAGE_MAX_LENGTH).optional() }),
  z.object({ ...baseFields, contentClass: z.literal("url"),
    url: z.url({ protocol: /^https?$/ }) }),
  z.object({ ...baseFields, contentClass: z.literal("file"),
    fileUrl: z.string().min(1), fileName: z.string().min(1), fileSize: z.number().int().nonnegative() }),
]);
```

The client sends the class its form rendered; it is not trusted. The service derives the class from the type's name and rejects a mismatch, and it writes the `contentType` column itself. `pickFieldsForClass` then nulls every column the class does not use, so an item can never hold both a `url` and a `content`.

## Where type-specific logic lives

| Concern                                              | Lives in                                         | Not in                |
| ---------------------------------------------------- | ------------------------------------------------ | --------------------- |
| icon, color, label, order                            | `ItemType` row, `TypeIcon`, `SYSTEM_TYPE_ORDER`   | actions               |
| type name to class (`getContentClass`), slug parsing | `item-types/domain/item-type.ts`                  | components, actions   |
| which columns a class stores                         | `items/domain/item-fields.ts`                     | actions               |
| shape of the input per class                         | `items/schemas.ts`                                | components            |
| which fields the form asks for                       | `_internal/components/fields/*`                   | actions, services     |
| how the content is displayed                         | `_internal/components/content/*`                  | actions, services     |
| ownership, limits, writes                            | `items/services/item.ts`                          | components            |

How the components adapt: `ItemForm` and `ItemDetail` call `getContentClass(type.name)` and render one field set or one content view.

- `TextContent` further branches on the type name: syntax-highlighted code for snippet and command, rendered markdown for note, plain preformatted text for prompt.
- `UrlContent` renders the link, `FileContent` a download link, or a preview for an image.

Adding things:

- **A new built-in type of an existing class:** a row in `systemItemTypes`, an entry in `CONTENT_CLASS_BY_TYPE`, a place in `SYSTEM_TYPE_ORDER`, and (if it renders differently) a branch in the content component. No new action, query, route or schema.
- **A new class:** a schema variant, a `pickFieldsForClass` branch, one `fields/` and one `content/` component, and a `contentType` value.

## Component responsibilities

| Component             | Kind   | Job                                                                                                  | Data in            | Calls                          |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------ |
| `ItemList`            | server | renders a list of `ItemRow`, or an empty state                                                       | `DashboardItem[]`  | none                           |
| `ItemRow` (existing)  | server | one row: type icon and color, title, flags, tags, date; a link to `?item=<id>`                       | `DashboardItem`    | none                           |
| `ItemDrawer`          | server | reads the item for `?item`; renders nothing if there is none                                         | `itemId`           | `getItemDetail`                |
| `ItemDrawerShell`     | client | the `Sheet`; closing removes `?item` from the URL                                                    | children           | router                         |
| `ItemDetail`          | server | header with icon and type chip, content by class, tags, collections, created and updated dates       | `ItemDetail`       | none                           |
| `ItemActions`         | client | favorite and pin toggles, copy (clipboard, no server), edit (switches to the form), delete (opens the dialog) | `ItemDetail` | `updateItem`            |
| `ItemForm`            | client | create and edit; type select (create only), common fields, then the fields of the class; toasts errors | `ItemFormValues`, `types` | `createItem`, `updateItem` |
| `TextFields` / `UrlFields` / `FileFields` | client | the inputs of one class                                                    | form state         | none                           |
| `DeleteItemDialog`    | client | confirmation; on success closes the drawer                                                           | `id`, title        | `deleteItem`                   |
| `NewItemSheet`        | client | hosts `ItemForm` in create mode; opened by the top bar's "New Item" button                           | system types       | none (the form calls)          |

- Server components call queries; client components call actions through `useTransition` and report failures with `toast`, as `ChangePasswordForm` does.
- Data passed to the form is plain strings and arrays (`ItemFormValues`), mapped from `ItemDetail` by a pure function, so no `Date` or Prisma shape crosses into a client component.
- `TopBar` is in `app-shell` (rank 10) and may import `items` (rank 6). Today its "New Item" button has no handler.

## Boundaries and ranks

`items` is rank 6: it may import `auth` (1) and `item-types` (4), not `collections` (7) or anything above.

- **Collection membership is not written by item CRUD.** Writing `ItemCollection` would need a check that the collection belongs to the user, which reads a model of the higher-ranked `collections`. Proposed: item create and edit handle tags only, the drawer shows collections read-only, and adding an item to a collection belongs to `collections` (rank 7, a `setItemCollections` service and action), composed by the page. The alternative, a narrow Prisma read of `Collection` ids inside the `items` service, crosses the one-way rule and is not recommended.
- **Tags stay inside `items`** (a `Tag` upsert by `userId_name`, which `@@unique([userId, name])` allows) until a `tags` feature exists at rank 4; the tag code then moves down to it.
- **The free-tier limit** (50 items) belongs in `billing/domain/limits.ts` with `getEntitlements`. `billing` does not exist, so `createUserItem` only marks the spot: the count and the check go in the service, next to the insert, never in the action.
- **Items of the file class** need `files` (rank 4, presigned upload to R2). CRUD only stores the three file columns that the upload produced.

## Security and ownership

- Every Server Action is a public POST endpoint. Validate and authorize inside the action even though the form already did.
- `getSessionUser()` runs before the `try` block, because `redirect` works by throwing and a `catch` would swallow it.
- `userId` is in the `where` of every read and write. Updating and deleting by id alone is never allowed; a foreign id answers "Item not found" and does not reveal that the row exists.
- The type must be visible to the user: a system type, or one of their own custom types.
- `url` is restricted to `http` and `https` in the schema. A `javascript:` URL would otherwise become a clickable link in `UrlContent`.
- Content is displayed as text. The markdown renderer for notes must not allow raw HTML.
- Bounded input: maximum lengths for title, description, content, language, tag count and tag length.

## Revalidation

After a successful mutation the action calls `revalidatePath("/", "layout")`. The sidebar counts live in `(app)/layout.tsx`, and the dashboard sections and the type pages show item data too, so invalidating the `(app)` layout and everything under it is the one call that keeps all of them consistent. Per the Next.js docs, `revalidatePath` with a layout type marks the path and the pages beneath it, and the refresh happens on the next visit. It is called in the action because services may not import `next/cache`.

On the client: after create, open the new item (`router.replace` with `?item=<id>` from the returned id); after delete, remove `?item`.

## Open decisions

1. **`contentType` of the file class.** `FILE` is proposed. Decide it with the upload feature, and consider one exported constant or enum in `items/domain` so the three values cannot drift from the schema union and `pickFieldsForClass`.
2. **Can an item change type?** Proposed: no. `updateItem` takes no `typeId`, which also avoids moving data between classes. Changing between types of the same class could be added later.
3. **Class of a custom type.** The schema allows custom types, but nothing says which class one has. The creation of custom types must choose it; the default would be text.
4. **File deletion.** Deleting a file or image item must also purge the object in R2. Per "Background work", that means writing the intent to the database first and processing it from a cron route, not `after()`.
5. **Where "New Item" picks the type.** The form has a type select (create only), preselected from the route when there is one. Whether the top bar button should offer all seven types, or only the types the plan allows, depends on gating that does not exist yet.

## Not in this design

- Search, pagination and filtering of the list (`search` feature, rank 8).
- Import and export, AI features, sharing.
- Collection membership writes and the `tags`, `files` and `billing` features (see above).
- UI primitives and libraries that are missing. `components/ui` has alert-dialog, avatar, badge, button, dropdown-menu, input, sheet, skeleton and sonner. A textarea, label and select will be needed for the form, and `package.json` has no syntax highlighter and no markdown renderer.

## Suggested build order

Each slice is one feature cycle from `context/ai-interaction.md`, small enough to review on its own.

1. The route: slug helpers, `getItemTypeByName`, `getItemsByType`, `ItemList`, the page, the proxy matcher, `ItemRow` as a link.
2. The drawer, read-only: `getItemDetail`, `ItemDrawer`, `ItemDetail` with the three content views, mounted on the type page and the dashboard.
3. Delete and the flags (`deleteItem`, `updateItem` flags variant, `ItemActions`, `DeleteItemDialog`). These are the smallest mutations and set up `actions/item.ts`, `services/item.ts` and the revalidation.
4. Create: the schema, `createUserItem`, `ItemForm`, `NewItemSheet` and the top bar button.
5. Edit: `updateItem` for the form, `ItemForm` in edit mode.
6. File and image items, after `files` and `billing` exist.
