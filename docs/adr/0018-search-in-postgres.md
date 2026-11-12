# 0018. Search runs in Postgres, with one narrow raw-SQL exception

- Status: accepted
- Date: 2026-11-12

## Context

The command palette downloaded an index when the app loaded and each time it opened: `GET /api/search` returned the newest 1000 items, with their full content read to cut a preview, plus every collection, and the browser searched them with Fuse.js. A Pro user has no item limit, so item 1001 could never be found, and the payload grew with every item. The route had no rate limit.

Search belongs on the server: a full-text index in Postgres, a page of results per request, the request sent after a pause in typing. Two rules stand in the way:

- [ADR 0009](0009-read-write-split-enforced-by-lint.md) bans `prisma.$queryRaw` in `queries.ts` and in services. Prisma cannot match or rank a `tsvector`
- A feature reads only its own models: items (and their tags) belong to `items`, collections to `collections`. `search` owns no model

Tag names live in `Tag`, joined through `ItemTag`, so a GIN index on `Item` cannot cover them. A query like "react hook" should find an item tagged `react` whose title says "hook", so the tags must be in the same vector as the text.

## Options

For running the full-text read:

1. **Prisma's `fullTextSearchPostgres` preview.** It builds the `tsvector` in every query from the listed columns, so no index is used; it cannot weight the title above the content, add a typo match, or search the tags. Rejected
2. **TypedSQL (`$queryRawTyped`).** `prisma generate --sql` needs a database to type the queries, and `npm run build` touches no database ([ADR 0013](0013-how-schema-changes-reach-production.md)). Rejected
3. **`prisma.$queryRaw` in one file per owning feature**, allowed by a lint exception that names the files and keeps every other ban

For the tags:

1. **A second query on tags, merged in the service.** Each term must then match within one field: "react hook" misses the item above
2. **A trigger on `ItemTag`** keeping a column in step. It covers every writer and leaves no stale window, but it is logic in the database that no code shows and no unit test reaches
3. **A denormalised column written by the code** in the same write as the tags, through one pure function

## Decision

- **Index.** A stored generated `tsvector` on `Item` (title and tags weight A, description B, content and URL C) and on `Collection` (name A, description B), each with a GIN index; `pg_trgm` GIN indexes on `Item.title` and `Collection.name` for typos. Every text goes through `regexp_replace(x, '[^[:alnum:]]+', ' ', 'g')` first, so `console.log`, `next.config.ts` and `react.dev` are split into words (the `simple` parser keeps them whole). The `simple` configuration does no stemming: the content is code and several languages. `STORED` is written out, because Postgres 18 makes a generated column virtual by default and a virtual column cannot be indexed. Prisma reads the generation expression as a default, so `schema.prisma` carries it in `dbgenerated(...)` exactly as `pg_get_expr` prints it; without that, every `migrate dev` would try to drop it
- **Tags.** Option 3: `Item.searchTags`, the tag names sorted and joined by spaces by `toSearchTags` (`items/domain/search-text.ts`). Every write of `ItemTag` sets it in the same write: `createUserItem`, `updateUserItem`, `prisma/seed.ts`, and the import of the planned `import-export` feature
- **Query text.** `toPrefixTsQuery` splits the typed text the same way as the index, drops terms under 2 characters, keeps at most 8, makes each a required prefix (`react:* & hook:*`); only letters and digits reach `to_tsquery`. The typo match (`text <% title`, ranked by `word_similarity`) runs from 3 letters or digits. A text with neither (`toSearchMatch` is null) finds nothing, without a query, and the palette sends no request for it
- **Raw SQL.** Option 3: `items/_internal/queries/search-ranking.ts` and `collections/_internal/queries/search-ranking.ts` alone may call `prisma.$queryRaw`, the tagged template that sends every value as a parameter; `eslint.config.mjs` names the two files, not a glob. Writes, `$transaction`, `$executeRaw`, `$queryRawUnsafe`, `$queryRawTyped` and `Prisma.raw` stay banned there. The SQL fragments they share (the match and the rank) are in `lib/full-text-search.ts`, which builds them with `Prisma.sql` and runs nothing. They return ranked ids only; the public `queries/search.ts` of each feature reads the rows through Prisma, scoped by `userId` again, and keeps the rank order. `search/services/search.ts` composes them with `getEntitlements`, which locks the uploads of a Free user
- **Paging.** 20 items per page, ordered by rank, then `updatedAt` and `id`, read with one row more to know whether another page exists. The cursor is the offset of the next page, up to 1000; past that no cursor is offered. The palette drops an item it already shows when a later page repeats it (its rank moved between pages). Collections, at most 5, come with the first page only
- **Route.** `GET /api/search?q=&cursor=` stays a route: Server Actions run one at a time, and typing needs the latest request to win. Session (401), Zod (400), one service call, `Cache-Control: private, no-store`. A per-user limit `search:user-minute` (120 a minute) is checked first: 429 with `Retry-After`, 503 when the limiter cannot answer. The request's signal goes to the service, which checks it between steps: Prisma cannot cancel a running statement, so an abort skips the reads not started yet and the running one finishes. An abandoned request answers 499 and is not reported
- **Palette.** An empty `q` returns the recent list (the last edited 8 items and 5 collections), read once when the palette opens; clearing the input shows it again with no request. A typed text is sent after a 250 ms pause; a new text, or the palette closing, aborts the request before it, so a late answer never lands. While an answer is pending the last results stay, dimmed and not selectable. `useDeferredValue` is not used: it does not reduce requests, and the list holds at most a page of rows

## Consequences

- Every item is searchable, whatever the account's size; the palette downloads a page of results instead of the account
- Two files in the codebase run raw SQL for reads; a third needs a new record, not a wider glob
- `searchTags` is a copy: a new writer of `ItemTag` that forgets `toSearchTags` leaves tag search wrong for those items. Between the migration and the new code going live, an item whose tags the old deployment edits keeps stale `searchTags` until its next edit
- A change of the generated expression is a new migration that drops and adds the column, with the `dbgenerated` text copied again
- The GIN indexes are global, not per user: a query walks every user's matches for its terms before the `userId` filter. Fine at this size; if it is not, `btree_gin` with an index on `("userId", "searchVector")` is the next step
- Adding the generated columns rewrites `Item` and `Collection` under an `ACCESS EXCLUSIVE` lock, and the plain `CREATE INDEX` blocks writes while it runs; both are short at the current size
- The recent list is as fresh as the last open; a search is always fresh
