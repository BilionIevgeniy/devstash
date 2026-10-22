import type { Prisma } from "@/generated/prisma/client";
import { itemTypeSelect, toItemTypeInfo } from "@/lib/db/item-types";
import { prisma } from "@/lib/prisma";
import type {
  CollectionStats,
  DashboardCollection,
  SidebarCollections,
} from "@/types/collections";
import type { ItemTypeInfo } from "@/types/items";

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

function rankTypesByUsage(
  typeIds: string[],
  typesById: Map<string, ItemTypeInfo>,
): ItemTypeInfo[] {
  const counts = new Map<string, number>();
  for (const id of typeIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const ranked: { type: ItemTypeInfo; count: number }[] = [];
  for (const [id, count] of counts) {
    const type = typesById.get(id);
    if (type) {
      ranked.push({ type, count });
    }
  }

  return ranked
    .sort((a, b) => b.count - a.count || a.type.name.localeCompare(b.type.name))
    .map(({ type }) => type);
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
