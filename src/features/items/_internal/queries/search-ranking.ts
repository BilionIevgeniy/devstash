import "server-only";

import type { SearchMatch } from "@/features/items/domain/search-text";
import { Prisma } from "@/generated/prisma/client";
import { fullTextMatchSql, fullTextRankSql } from "@/lib/full-text-search";
import { prisma } from "@/lib/prisma";

// The one raw read of items (ADR 0018): Prisma cannot match or rank a tsvector.
// The lint lets this file call prisma.$queryRaw, a tagged template, so every
// value goes as a parameter; it still forbids writes, $queryRawUnsafe and
// Prisma.raw. It returns ids only, and the rows are read through Prisma by the
// caller.

// The title outweighs the content (weights A to C in the vector), and a title
// close to the typed text adds its word similarity.
const ITEM_COLUMNS = {
  vector: Prisma.sql`i."searchVector"`,
  text: Prisma.sql`i."title"`,
};

// One page of the user's matching item ids, best first; the newest edit and
// then the id settle equal ranks, so pages do not overlap.
export async function rankUserItemIds(
  userId: string,
  match: SearchMatch,
  page: { offset: number; limit: number },
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT i."id"
    FROM "Item" AS i
    WHERE i."userId" = ${userId} AND (${fullTextMatchSql(match, ITEM_COLUMNS)})
    ORDER BY ${fullTextRankSql(match, ITEM_COLUMNS)} DESC, i."updatedAt" DESC, i."id" DESC
    LIMIT ${page.limit} OFFSET ${page.offset}
  `;
  return rows.map(({ id }) => id);
}
