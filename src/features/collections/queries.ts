import "server-only";

import { collectionAccent } from "@/features/collections/domain/collection-accent";
import { COLLECTIONS_PER_PAGE } from "@/features/collections/domain/pagination";
import { rankTypesByUsage } from "@/features/item-types/domain/rank-types-by-usage";
import type {
  CollectionOption,
  CollectionStats,
  CollectionSummary,
  DashboardCollection,
  FavoriteCollection,
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

const collectionItemTypesSelect = {
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
async function typeRanker(userId: string, rows: CollectionItemTypes[]) {
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

  const rankTypes = await typeRanker(userId, collections);

  return collections.map(({ items, _count, ...collection }) => ({
    ...collection,
    itemCount: _count.items,
    types: rankTypes({ items }),
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

export function getCollectionOptions(
  userId: string,
): Promise<CollectionOption[]> {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
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
