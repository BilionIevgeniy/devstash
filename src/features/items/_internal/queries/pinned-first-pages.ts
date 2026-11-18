import "server-only";

import { PINNED_GROUP_PAGE_SIZE } from "@/features/items/domain/list/list-pages";
import type { PinnedItemSort } from "@/features/items/domain/list/pinned-items";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

// The order of each sort, the same keys as pinnedKeyset (list-keyset.ts), so
// the cursor of a first page read here continues exactly in
// getPinnedGroupPage. Item.title is collated "und-x-icu" on the column, so
// both orders compare titles alike. Fixed fragments: nothing here is built
// from a string.
const PINNED_ORDER: Record<PinnedItemSort, Prisma.Sql> = {
  newest: Prisma.sql`"createdAt" DESC, "id" DESC`,
  oldest: Prisma.sql`"createdAt" ASC, "id" ASC`,
  "a-z": Prisma.sql`"title" ASC, "id" ASC`,
  "z-a": Prisma.sql`"title" DESC, "id" DESC`,
};

export interface PinnedRankedRow {
  id: string;
  typeId: string;
  /** Pinned items of this type, all of them. */
  count: number;
}

interface RankedRow {
  id: string;
  typeId: string;
  total: bigint;
}

// One read for every type, whatever their number (custom types, ADR 0031):
// the first page plus one row of each type with pins, in the sort's order,
// and the count of each type. Prisma cannot take N rows per group, so this is
// the tagged $queryRaw, every value a parameter.
export async function getPinnedRankedRows(
  userId: string,
  sort: PinnedItemSort,
): Promise<PinnedRankedRow[]> {
  const rows = await prisma.$queryRaw<RankedRow[]>`
    SELECT "id", "typeId", "total"
    FROM (
      SELECT "id", "typeId",
        ROW_NUMBER() OVER (PARTITION BY "typeId" ORDER BY ${PINNED_ORDER[sort]}) AS "position",
        COUNT(*) OVER (PARTITION BY "typeId") AS "total"
      FROM "Item"
      WHERE "userId" = ${userId} AND "isPinned" = true
    ) AS "ranked"
    WHERE "position" <= ${PINNED_GROUP_PAGE_SIZE + 1}
    ORDER BY "typeId", "position"
  `;
  return rows.map(({ id, typeId, total }) => ({
    id,
    typeId,
    count: Number(total),
  }));
}
