import "server-only";

import { COLLECTIONS_PER_PAGE } from "@/features/collections/domain/pagination";
import { rankTypesByUsage } from "@/features/item-types/domain/rank-types-by-usage";
import type {
  CollectionOption,
  CollectionStats,
  CollectionSummary,
  DashboardCollection,
  SearchableCollection,
  SidebarCollections,
} from "@/features/collections/types";
import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import type { ItemTypeInfo } from "@/features/item-types/types";
import type { Prisma } from "@/generated/prisma/client";
import { type Paginated, readPage } from "@/lib/pagination";
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
  rows: { skip?: number; take?: number } = {},
): Promise<DashboardCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, ...where },
    // The id settles equal dates, so a row cannot move between pages.
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...rows,
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
  return fetchCollections(userId, {}, { take: DASHBOARD_COLLECTIONS_LIMIT });
}

export function getUserCollections(
  userId: string,
  page: number,
): Promise<Paginated<DashboardCollection>> {
  return readPage(
    page,
    COLLECTIONS_PER_PAGE,
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

export async function getSidebarCollections(
  userId: string,
): Promise<SidebarCollections> {
  const [favorites, recent] = await Promise.all([
    fetchCollections(userId, { isFavorite: true }),
    fetchCollections(userId, {}, { take: SIDEBAR_RECENT_LIMIT }),
  ]);
  return { favorites, recent };
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

// The collections the command palette searches. Narrower than
// getUserCollections: the palette runs this on every open and shows no types.
export async function getSearchableCollections(
  userId: string,
): Promise<SearchableCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, _count: { select: { items: true } } },
  });
  return collections.map(({ _count, ...collection }) => ({
    ...collection,
    itemCount: _count.items,
  }));
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
