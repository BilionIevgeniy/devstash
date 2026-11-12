# 0020. An import is data input in batches, not a file upload

- Status: accepted
- Date: 2026-11-12

## Context

A Pro user imports the JSON of an export ([ADR 0019](0019-export-without-file-bytes.md)). Uploading the file to the server does not fit: a request body over 4.5 MB fails on Vercel, a Server Action takes 1 MB by default, and file bytes are never proxied ([ADR 0004](0004-direct-upload-to-r2.md)). Every create already has its rules in one place: `createUserItem` and `createUserCollection` hold the validation, the plan checks and the advisory lock of the Free limit.

## Decision

- **The browser reads the file.** Up to 5 MB, `JSON.parse`, then the envelope only (`importFileSchema`): version 1 (a newer version is named as such), both lists present, at most 10 000 items and 1 000 collections. A file that fails sends nothing. The records are not checked there: one record outside today's limits must fail alone, not the file
- **Batches to Server Actions.** At most 50 records and 512 KB of JSON each (`import-export/domain/import-batches.ts`), sent one after another: collections first (`importCollections`), then items (`importItems`). A record alone over 512 KB is not sent and is reported. Each action parses the batch, reads the session and makes one service call
- **One service call per record.** `import-export/services/import.ts` checks each record on the server with the create schemas (`createItemSchema`, `createCollectionSchema`) and creates it through the owner's service. A batch is not atomic: a refused record goes into the summary with the service's words, an unexpected error is logged and fails that record only, and the batch goes on
- **Collections first, ids mapped.** The collection batch answers the id each exported collection has in this account; the browser rewrites each item's `collectionIds` before it sends the item batch, dropping ids it does not know, so the item is still created. A foreign id still fails in `createUserItem` (the owner is in the connect)
- **Duplicates are skipped and counted, so a second run creates nothing.** An item is the same when its type, title and the text its type stores (content or URL) match (`itemDuplicateKey`), in the account or earlier in the batch; two snippets with one title and different code are both kept. A collection is the same by name; names are not unique, so the oldest one wins, the same one on every run, and its items go there. This refines the spec's "title + type", which would drop the second of two such snippets
- **Files are skipped and counted**, not stored as links: the link of an export expires within two hours. The summary says to download them from the file and upload them again. This changes the spec's "come in as links only"
- **Not restored:** favorite, pin and dates. The create services do not take them, and the import says so
- **Limits.** Pro only, checked in each batch; per user a minute, as many batches as the largest file can need (`IMPORT_MAX_BATCHES`, 240: `import:user`), so a rerun of a large import, whose duplicate batches answer in milliseconds, is never stopped at the same batch, and a script still cannot call the action without bound
- **The browser run.** Leaving the page stops the run at the next batch with no summary and no refresh; a reload asks first. The page is refreshed once at the end, and the summary comes in the commit that brings it

## Consequences

- An import stopped halfway (a refused batch, the connection) leaves what was created; running it again skips that and goes on
- Server Actions run one at a time, so a large import is sequential: 2 000 items are 40 batches
- Importing from other tools, or a ZIP with files, needs its own decision
