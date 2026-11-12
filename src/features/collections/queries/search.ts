import "server-only";

import { rankUserCollectionIds } from "@/features/collections/_internal/queries/search-ranking";
import type { SearchableCollection } from "@/features/collections/types";
import {
  COLLECTION_RESULTS_MAX,
  toSearchMatch,
} from "@/features/items/domain/search-text";
import type { Prisma } from "@/generated/prisma/client";
import { orderByIds } from "@/lib/order-by-ids";
import { prisma } from "@/lib/prisma";

// The collections of the command palette (ADR 0018).

const searchableCollectionSelect = {
  id: true,
  name: true,
  _count: { select: { items: true } },
} satisfies Prisma.CollectionSelect;

type RawSearchableCollection = Prisma.CollectionGetPayload<{
  select: typeof searchableCollectionSelect;
}>;

function toSearchableCollection({
  _count,
  ...collection
}: RawSearchableCollection): SearchableCollection {
  return { ...collection, itemCount: _count.items };
}

// The list of an empty query: the last edited collections.
export async function getRecentSearchableCollections(
  userId: string,
): Promise<SearchableCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: COLLECTION_RESULTS_MAX,
    select: searchableCollectionSelect,
  });
  return collections.map(toSearchableCollection);
}

// The user's collections matching the text by name or description, best first.
export async function searchUserCollections(
  userId: string,
  text: string,
): Promise<SearchableCollection[]> {
  const match = toSearchMatch(text);
  if (match === null) return [];

  const ids = await rankUserCollectionIds(
    userId,
    match,
    COLLECTION_RESULTS_MAX,
  );
  if (ids.length === 0) return [];
  const rows = await prisma.collection.findMany({
    where: { userId, id: { in: ids } },
    select: searchableCollectionSelect,
  });
  return orderByIds(ids, rows).map(toSearchableCollection);
}
