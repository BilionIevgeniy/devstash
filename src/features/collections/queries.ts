import "server-only";

import { rankTypesByUsage } from "@/features/collections/domain/rank-types-by-usage";
import type {
  CollectionStats,
  DashboardCollection,
  SidebarCollections,
} from "@/features/collections/types";
import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import type { ItemTypeInfo } from "@/features/item-types/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const DASHBOARD_COLLECTIONS_LIMIT = 6;
const SIDEBAR_RECENT_LIMIT = 4;

const collectionSelect = {
  id: true,
  name: true,
  description: true,
  isFavorite: true,
  _count: { select: { items: true } },
  items: { select: { item: { select: { typeId: true } } } },
} satisfies Prisma.CollectionSelect;

async function fetchTypesById(
  typeIds: string[],
): Promise<Map<string, ItemTypeInfo>> {
  const types = await prisma.itemType.findMany({
    where: { id: { in: typeIds } },
    select: itemTypeSelect,
  });

  return new Map(types.map((type) => [type.id, toItemTypeInfo(type)]));
}

async function fetchCollections(
  userId: string,
  where: Prisma.CollectionWhereInput,
  take?: number,
): Promise<DashboardCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, ...where },
    orderBy: { updatedAt: "desc" },
    take,
    select: collectionSelect,
  });

  const typeIds = new Set(
    collections.flatMap(({ items }) => items.map(({ item }) => item.typeId)),
  );
  const typesById = await fetchTypesById([...typeIds]);

  return collections.map(({ items, _count, ...collection }) => ({
    ...collection,
    itemCount: _count.items,
    types: rankTypesByUsage(
      items.map(({ item }) => item.typeId),
      typesById,
    ),
  }));
}

export function getRecentCollections(
  userId: string,
): Promise<DashboardCollection[]> {
  return fetchCollections(userId, {}, DASHBOARD_COLLECTIONS_LIMIT);
}

export async function getSidebarCollections(
  userId: string,
): Promise<SidebarCollections> {
  const [favorites, recent] = await Promise.all([
    fetchCollections(userId, { isFavorite: true }),
    fetchCollections(userId, {}, SIDEBAR_RECENT_LIMIT),
  ]);
  return { favorites, recent };
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
