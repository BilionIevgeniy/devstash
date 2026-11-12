# 0019. The export carries no file bytes, and streams page by page

- Status: accepted
- Date: 2026-11-12

## Context

Export is a Pro feature on the pricing page and serves the GDPR rights of access and portability (Art. 15, 20). An account has no item limit on Pro, and file and image items hold up to 10 MB each in R2. Two rules stand in the way of packing everything into one download:

- File bytes never pass through a Server Action or a route handler ([ADR 0004](0004-direct-upload-to-r2.md)): a function that proxies them pays for the bandwidth and the time, and hits the platform's limits
- Memory of a serverless function is small, so an export must not read every item at once

## Options

1. **ZIP with the files**, built on the server. It breaks ADR 0004 and needs a background job for a large account. Rejected for now; a ZIP comes back only with its own ADR
2. **JSON built in memory**, then sent. Memory grows with the account. Rejected
3. **JSON streamed in pages, files as presigned links**

## Decision

- Option 3. `GET /api/export` (session, one call into `import-export/services/export.ts`, headers) answers a `ReadableStream`: the opening with the version, the dates and every collection (a row is small, so they are read at once), then one page of 100 items per `pull`, then `]}`. A page is read only when the client has taken the one before, so the server holds about one page whatever the size of the account
- Format, version 1: `{ "version": 1, "exportedAt", "linksExpireAt", "collections": [{ id, name, description, createdAt }], "items": [{ id, type, title, description, content, url, language, tags, collectionIds, isFavorite, isPinned, createdAt, updatedAt, file }] }`. `file` is `{ name, size, downloadUrl }` or null: a link signed by `items` with the one `now` of the export, so all links share one window, and `linksExpireAt` (`items/domain/export.ts`) states its end. No object key leaves the server
- The pages are read by `items/_internal/queries/export.ts` (they carry the key, [ADR 0010](0010-pagination-in-lib-and-object-key-reads-in-internal.md)) through the public `items/services/export.ts`, which reads the plan itself and signs only what the plan gives, like the other signing services. Keyset pages by id: a row added or deleted during the export cannot shift the pages after it
- Pro only (403 otherwise), once a minute per user (`export:user`, 429 with `Retry-After`, 503 when the limiter cannot answer). The plan is checked first, so a Free user's refusal uses up nothing
- An error after the first chunk cannot change the status: the stream errors and is logged. The browser saves the file only when it ends with `]}`, and otherwise says the export was interrupted
- The settings page downloads through `fetch` and saves the blob, for a pending state and readable errors. The browser holds the finished file, which is what a download is; the server stays flat

## Consequences

- A file item's bytes are reached by the link for at most two hours. Someone who needs them later exports again
- The import cannot restore files from an export ([ADR 0020](0020-import-as-batched-data-input.md))
- A new field is added to the format without a version change only if an older import ignores it; anything else is version 2
