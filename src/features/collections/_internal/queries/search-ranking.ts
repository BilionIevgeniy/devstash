import "server-only";

import type { SearchMatch } from "@/features/items/domain/search-text";
import { Prisma } from "@/generated/prisma/client";
import { fullTextMatchSql, fullTextRankSql } from "@/lib/full-text-search";
import { prisma } from "@/lib/prisma";

// The one raw read of collections (ADR 0018), allowed by the same lint
// exception as items/_internal/queries/search-ranking.ts: a tagged template,
// ids only, no writes.

const COLLECTION_COLUMNS = {
  vector: Prisma.sql`c."searchVector"`,
  text: Prisma.sql`c."name"`,
};

// The user's best matching collection ids.
export async function rankUserCollectionIds(
  userId: string,
  match: SearchMatch,
  limit: number,
): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c."id"
    FROM "Collection" AS c
    WHERE c."userId" = ${userId} AND (${fullTextMatchSql(match, COLLECTION_COLUMNS)})
    ORDER BY ${fullTextRankSql(match, COLLECTION_COLUMNS)} DESC, c."updatedAt" DESC, c."id" DESC
    LIMIT ${limit}
  `;
  return rows.map(({ id }) => id);
}
