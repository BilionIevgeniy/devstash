# Current Feature: Pagination

## Status

In Progress

## Goals

- `/items/[type]`, `/collections/[id]` and `/collections` are paginated, with `ITEMS_PER_PAGE = 21` and `COLLECTIONS_PER_PAGE = 21`
- Controls sit at the bottom of the page, with page numbers and prev/next links
- Prev/next are greyed out and disabled when there's no page to go to
- The dashboard uses `DASHBOARD_COLLECTIONS_LIMIT = 6` and `DASHBOARD_RECENT_ITEMS_LIMIT = 10`
- Each page fetches only the rows it shows, never the full list

## Notes

- Spec: `context/features/pagination-spec.md`
- `/collections` is included: the spec's requirements name only `/items/[type]` and `/collections/[id]`, but `COLLECTIONS_PER_PAGE` only makes sense on the `/collections` list, which currently reads every collection with no limit
- Dashboard change: `RECENT_ITEMS_LIMIT` in `src/features/items/queries.ts` is 20 and becomes 10, so the dashboard shows fewer recent items. `DASHBOARD_COLLECTIONS_LIMIT` is already 6 in `src/features/collections/queries.ts`
- Where the code goes (decided in the plan review): the page parser and page math in `src/lib/pagination.ts`, since `components/common` cannot import a feature (ADR and `docs/architecture.md` change this rule); `ITEMS_PER_PAGE` in `items/domain/`, `COLLECTIONS_PER_PAGE` in `collections/domain/`; `PaginationNav` in `src/components/common/`
- `items/queries.ts` is at its size limit: the five reads that return the object key move to `items/_internal/queries.ts` with the shared selects and mappers (the key counts as a secret under ADR 0009)
- `loading.tsx` does not show on a `?page` change: each page wraps its content in `<Suspense key={page}>` with the existing skeletons
- Collection sections group the page's items, ordered and labelled by the type's total in the whole collection
- Accepted trade-offs: an item created on a later page lands on page 1; a collection edited on a later page moves to page 1 (`updatedAt` order); "Ranking a collection's types reads every link" stays deferred in `context/todo.md`
- Docs to update: `docs/architecture.md`, `docs/modules.md`, `docs/item-types.md`, `context/architecture-rules.md`, `context/todo.md`, a new ADR

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
