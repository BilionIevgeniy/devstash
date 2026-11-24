import "server-only";

import { rankTypesByUsage } from "@/features/item-types/domain/rank-types-by-usage";
import { getItemTypesById } from "@/features/item-types/queries";
import type { DashboardCollection } from "@/features/collections/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

// The rows of a collection list with the types of their items, shared by the
// queries of the dashboard, the list, the sidebar and the favorites.

// The id settles equal dates, so rows keep their order between refreshes.
export const LAST_STARRED_FIRST = [
  { favoritedAt: { sort: "desc", nulls: "last" } },
  { id: "desc" },
] satisfies Prisma.CollectionOrderByWithRelationInput[];

export const collectionItemTypesSelect = {
  items: { select: { item: { select: { typeId: true } } } },
} satisfies Prisma.CollectionSelect;

const collectionSelect = {
  id: true,
  name: true,
  description: true,
  isFavorite: true,
  _count: { select: { items: true } },
  ...collectionItemTypesSelect,
} satisfies Prisma.CollectionSelect;

interface CollectionItemTypes {
  items: { item: { typeId: string } }[];
}

// One read of the types of all the rows; the result ranks those of one row.
export async function typeRanker(userId: string, rows: CollectionItemTypes[]) {
  const typeIds = new Set(
    rows.flatMap(({ items }) => items.map(({ item }) => item.typeId)),
  );
  const typesById = await getItemTypesById(userId, [...typeIds]);

  return ({ items }: CollectionItemTypes) =>
    rankTypesByUsage(
      items.map(({ item }) => item.typeId),
      typesById,
    );
}

export async function fetchCollections(
  userId: string,
  where: Prisma.CollectionWhereInput,
  rows: Pick<Prisma.CollectionFindManyArgs, "skip" | "take" | "orderBy"> = {},
): Promise<DashboardCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, ...where },
    // The id settles equal dates, so a row cannot move between pages.
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...rows,
    select: collectionSelect,
  });

  const rankTypes = await typeRanker(userId, collections);

  return collections.map(({ items, _count, ...collection }) => ({
    ...collection,
    itemCount: _count.items,
    types: rankTypes({ items }),
  }));
}
