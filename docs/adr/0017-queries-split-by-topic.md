# 0017. `queries.ts` may split into `queries/<topic>.ts`

- Status: accepted
- Date: 2026-11-12

## Context

The query role of a feature is two files: `queries.ts` and, for reads that hand out a secret, `_internal/queries.ts` ([ADR 0009](0009-read-write-split-enforced-by-lint.md), [ADR 0010](0010-pagination-in-lib-and-object-key-reads-in-internal.md)). The lint knows the role by these exact names: the role direction (a query imports no service, action or component), the ban on importing a query from `schemas.ts`, and the ban on writes, transactions and raw SQL in a query.

Feature 7 (URL filters and sort) adds a sort and a tag filter to the type pages. Their `where` and `orderBy` are shared by the read of cards (public) and the read of uploads (private, it returns the object key). `items/_internal/queries.ts` already counts 247 of its 250 lines.

Every place the rulebook allowed fails:

- Another file in `_internal/` with a new name has no role, so the lint would not ban writes in it
- The helpers in the public `queries.ts` make a cycle: `queries.ts` imports `_internal/queries.ts` for its selects and mappers, and the read of uploads would import the helpers back
- A service may not read with `prisma` ([ADR 0009](0009-read-write-split-enforced-by-lint.md))

## Options

1. **Raise the file limit** for query files. Hides the growth instead of naming the topics.
2. **Split by topic**, as `types.ts` already may (`types/<topic>.ts`): `queries/<topic>.ts` and `_internal/queries/<topic>.ts`, with the lint widened to the folder.
3. **Move the private reads into services.** Breaks ADR 0009.

## Decision

Option 2. A feature's `queries.ts` and `_internal/queries.ts` may each split into a folder of the same name with one file per topic. Every file there has the query role: `import "server-only"`, `userId` first, reads only. The file and the folder may stand side by side while only part of the reads has moved.

The lint targets of the query role in `eslint.config.mjs` name the folders too: the role direction, the ban on importing a query from `schemas.ts`, and the ban on writes (`src/features/**/queries/**/*.ts`).

First use: `items/_internal/queries/type-list.ts`, the `where` and `orderBy` of a type page and the read of its uploads.

## Consequences

- A query file splits by what it reads, and every part keeps the lint of the role
- An import names the topic (`@/features/items/_internal/queries/type-list`); `@/features/items/_internal/queries` still resolves to the file
- A reviewer checks that a new file in the folder starts with `import "server-only"` (not linted, the same as `queries.ts`)
