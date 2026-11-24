import "server-only";

import { fetchCollections } from "@/features/collections/_internal/queries/collection-rows";
import type {
  CollectionOption,
  CollectionSummary,
  DashboardCollection,
} from "@/features/collections/types";
import { CARDS_PER_PAGE, type Paginated, readPage } from "@/lib/pagination";
import { prisma } from "@/lib/postgres/prisma";

export function getUserCollections(
  userId: string,
  page: number,
): Promise<Paginated<DashboardCollection>> {
  return readPage(
    page,
    CARDS_PER_PAGE,
    () => prisma.collection.count({ where: { userId } }),
    (skip, take) => fetchCollections(userId, {}, { skip, take }),
  );
}

export function getCollectionById(
  userId: string,
  id: string,
): Promise<CollectionSummary | null> {
  return prisma.collection.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

export function getCollectionOptions(
  userId: string,
): Promise<CollectionOption[]> {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
