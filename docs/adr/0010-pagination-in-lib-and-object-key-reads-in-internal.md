# 0010. Pagination lives in `lib`, and reads of the object key in `_internal/queries.ts`

- Status: accepted
- Date: 2026-11-04

## Context

Pagination came to `/items/[type]`, `/collections` and `/collections/[id]`. `docs/architecture.md` put the `searchParams` parser in a feature's `schemas.ts` and the page math in its `domain/`. Two features need that code, and so does `PaginationNav` in `components/common`, which cannot import a feature.

The change also pushed `items/queries.ts` past the limit of 250 lines. Five of its reads hand the R2 object key to their caller and are called only by services of `items`, yet a function in `queries.ts` is public. [ADR 0009](0009-read-write-split-enforced-by-lint.md) keeps reads that return a secret in `_internal/queries.ts`, and names a password hash and a token, not the key.

## Options

For the page code:

1. **One copy per feature.** Respects the old rule, repeats the math, and `PaginationNav` still has no way to reach it.
2. **`lib/pagination.ts`.** The lowest layer every consumer can import. It holds no product words, and `readPage` takes callbacks, so it touches no Prisma.

For the size of `items/queries.ts`:

1. **Move only what is needed to fit.** No rule tells the moved reads from the ones left behind.
2. **Move every read of the object key to `_internal/queries.ts`.** One criterion, the same as ADR 0009.

## Decision

Option 2 in both.

- `lib/pagination.ts` holds `parsePage`, the page math, `pageHref`, `pageNumbers`, `readPage` and `Paginated<T>`. How many rows a page has stays with the feature: `items/domain/pagination.ts`, `collections/domain/pagination.ts`
- The object key counts as a secret under ADR 0009. `getItemDetail`, `getItemDetailOfType`, `getItemFileKey`, `getUploadItemsByType` and `getCollectionItemRecords` are in `items/_internal/queries.ts`, with the selects and mappers they share with `queries.ts`, which imports them from there

## Consequences

- Nothing outside `items` can import a read that returns the key
- A page past the end shows the last page with no redirect, so the URL can name a page that no longer exists until the next click
- A change of `?page` keeps the segment, so `loading.tsx` does not show. Each paginated page renders its content in `<Suspense key={page}>` with that file as the fallback
- `items/_internal/queries.ts` also holds code that is not about the key: the selects and mappers shared with the public reads, since moving them the other way would export Prisma-shaped helpers to every higher feature, and `getCollectionTypeCounts`, which shares its `where` with `getCollectionItemRecords` and has no caller outside the collection listing service
