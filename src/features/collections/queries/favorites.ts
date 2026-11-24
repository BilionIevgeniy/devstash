import "server-only";

import {
  collectionItemTypesSelect,
  LAST_STARRED_FIRST,
  typeRanker,
} from "@/features/collections/_internal/queries/collection-rows";
import { collectionAccent } from "@/features/collections/domain/collection-accent";
import type { FavoriteCollection } from "@/features/collections/types";
import { prisma } from "@/lib/postgres/prisma";

// The favorites page shows no counts, and of the types only the accent. Every
// favorite is read with one row per item: there is no limit on favorites.
export async function getFavoriteCollections(
  userId: string,
): Promise<FavoriteCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    orderBy: LAST_STARRED_FIRST,
    select: {
      id: true,
      name: true,
      favoritedAt: true,
      updatedAt: true,
      ...collectionItemTypesSelect,
    },
  });
  const rankTypes = await typeRanker(userId, collections);

  return collections.map(({ id, name, favoritedAt, updatedAt, items }) => ({
    id,
    name,
    favoritedAt: favoritedAt ?? updatedAt,
    color: collectionAccent(rankTypes({ items })),
  }));
}
