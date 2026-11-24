import "server-only";

import { fetchCollections } from "@/features/collections/_internal/queries/collection-rows";
import type {
  CollectionStats,
  DashboardCollection,
} from "@/features/collections/types";
import { prisma } from "@/lib/postgres/prisma";

const DASHBOARD_COLLECTIONS_LIMIT = 6;

export function getRecentCollections(
  userId: string,
): Promise<DashboardCollection[]> {
  return fetchCollections(userId, {}, { take: DASHBOARD_COLLECTIONS_LIMIT });
}

export async function getCollectionStats(
  userId: string,
): Promise<CollectionStats> {
  const [total, favorites] = await Promise.all([
    prisma.collection.count({ where: { userId } }),
    prisma.collection.count({ where: { userId, isFavorite: true } }),
  ]);
  return { total, favorites };
}
