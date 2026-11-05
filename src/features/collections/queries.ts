import "server-only";

import { COLLECTIONS_PER_PAGE } from "@/features/collections/domain/pagination";
import { rankTypesByUsage } from "@/features/item-types/domain/rank-types-by-usage";
import type {
  CollectionOption,
  CollectionStats,
  CollectionSummary,
  DashboardCollection,
  FavoriteCollection,
  SearchableCollection,
  SidebarCollections,
} from "@/features/collections/types";
import { getItemTypesById } from "@/features/item-types/queries";
import {
  limitSidebarRows,
  SIDEBAR_ITEMS_LIMIT,
} from "@/features/items/domain/sidebar-items";
import type { Prisma } from "@/generated/prisma/client";
import { type Paginated, readPage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const DASHBOARD_COLLECTIONS_LIMIT = 6;

// The id settles equal dates, so rows keep their order between refreshes.
const LAST_STARRED_FIRST = [
  { favoritedAt: { sort: "desc", nulls: "last" } },
  { id: "desc" },
] satisfies Prisma.CollectionOrderByWithRelationInput[];

const collectionSelect = {
  id: true,
  name: true,
  description: true,
  isFavorite: true,
  _count: { select: { items: true } },
  items: { select: { item: { select: { typeId: true } } } },
} satisfies Prisma.CollectionSelect;

async function fetchCollections(
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

  const typeIds = new Set(
    collections.flatMap(({ items }) => items.map(({ item }) => item.typeId)),
  );
  const typesById = await getItemTypesById([...typeIds]);

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
  const take = SIDEBAR_ITEMS_LIMIT + 1;
  const [favoriteRows, recentRows] = await Promise.all([
    // Last starred first: a star leaves updatedAt alone, so a new favorite of
    // an old collection would otherwise fall past the limit.
    fetchCollections(
      userId,
      { isFavorite: true },
      { take, orderBy: LAST_STARRED_FIRST },
    ),
    fetchCollections(userId, {}, { take }),
  ]);
  const favorites = limitSidebarRows(favoriteRows);
  const recent = limitSidebarRows(recentRows);

  return {
    favorites: favorites.rows,
    recent: recent.rows,
    hasMoreFavorites: favorites.hasMore,
    hasMoreRecent: recent.hasMore,
  };
}

// Narrower than fetchCollections: the favorites page shows no types or counts.
export async function getFavoriteCollections(
  userId: string,
): Promise<FavoriteCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, isFavorite: true },
    orderBy: LAST_STARRED_FIRST,
    select: { id: true, name: true, favoritedAt: true, updatedAt: true },
  });
  return collections.map(({ id, name, favoritedAt, updatedAt }) => ({
    id,
    name,
    favoritedAt: favoritedAt ?? updatedAt,
  }));
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
