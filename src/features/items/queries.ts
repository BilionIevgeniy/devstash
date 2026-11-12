import "server-only";

import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import { toSearchPreview } from "@/features/items/_internal/domain/search-preview";
import {
  cardItemSelect,
  dashboardItemSelect,
  NEWEST_FIRST,
  toDashboardItem,
  toItemCardData,
} from "@/features/items/_internal/queries";
import {
  itemListOrderBy,
  itemListWhere,
} from "@/features/items/_internal/queries/type-list";
import { compareNames } from "@/features/items/domain/favorite-sort";
import { copyValueOf } from "@/features/items/domain/item-fields";
import type { ItemListFilter } from "@/features/items/domain/list-params";
import {
  limitSidebarRows,
  SIDEBAR_ITEMS_LIMIT,
} from "@/features/items/domain/sidebar-items";
import type {
  DashboardItem,
  FavoriteItem,
  ItemCardData,
  ItemEditState,
  ItemStats,
  SearchableItem,
  SidebarItem,
  SidebarItems,
} from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const DASHBOARD_RECENT_ITEMS_LIMIT = 10;
// Matches the planned item limit of the Free plan.
const DASHBOARD_PINNED_ITEMS_LIMIT = 50;
const SEARCH_INDEX_ITEM_LIMIT = 1000;

// The id settles equal dates, so rows keep their order between refreshes.
const LAST_STARRED_FIRST = [
  { favoritedAt: { sort: "desc", nulls: "last" } },
  { id: "desc" },
] satisfies Prisma.ItemOrderByWithRelationInput[];

const sidebarItemSelect = {
  id: true,
  title: true,
  type: { select: itemTypeSelect },
} satisfies Prisma.ItemSelect;

type RawSidebarItem = Prisma.ItemGetPayload<{
  select: typeof sidebarItemSelect;
}>;

function toSidebarItem({ type, ...item }: RawSidebarItem): SidebarItem {
  return { ...item, type: toItemTypeInfo(type) };
}

export async function getPinnedItems(userId: string): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: NEWEST_FIRST,
    take: DASHBOARD_PINNED_ITEMS_LIMIT,
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
}

// Every pin, for the pinned page. Narrower than getPinnedItems: no content is
// read, so the lack of a limit stays cheap.
export async function getAllPinnedItems(
  userId: string,
): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: NEWEST_FIRST,
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

export async function getRecentItems(userId: string): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: DASHBOARD_RECENT_ITEMS_LIMIT,
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
}

export async function getFavoriteItems(
  userId: string,
): Promise<FavoriteItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, isFavorite: true },
    orderBy: LAST_STARRED_FIRST,
    select: { ...dashboardItemSelect, favoritedAt: true, updatedAt: true },
  });
  return items.map(({ favoritedAt, updatedAt, ...item }) => ({
    ...toDashboardItem(item),
    favoritedAt: favoritedAt ?? updatedAt,
  }));
}

export async function getSidebarItems(userId: string): Promise<SidebarItems> {
  const [favorites, pinned] = await Promise.all([
    prisma.item.findMany({
      where: { userId, isFavorite: true },
      orderBy: LAST_STARRED_FIRST,
      take: SIDEBAR_ITEMS_LIMIT + 1,
      select: sidebarItemSelect,
    }),
    prisma.item.findMany({
      where: { userId, isPinned: true },
      orderBy: NEWEST_FIRST,
      take: SIDEBAR_ITEMS_LIMIT + 1,
      select: sidebarItemSelect,
    }),
  ]);
  const limitedFavorites = limitSidebarRows(favorites.map(toSidebarItem));
  const limitedPinned = limitSidebarRows(pinned.map(toSidebarItem));

  return {
    favorites: limitedFavorites.rows,
    pinned: limitedPinned.rows,
    hasMoreFavorites: limitedFavorites.hasMore,
    hasMorePinned: limitedPinned.hasMore,
  };
}

// The rows of a type page with a sort and a tag (feature 7). The page reads
// the count first and works out its position from it, so the count and the
// rows are read once each.
export function countItemsOfType(
  userId: string,
  typeId: string,
  tag: string | null,
): Promise<number> {
  return prisma.item.count({ where: itemListWhere(userId, typeId, tag) });
}

export async function getItemsOfType(
  userId: string,
  typeId: string,
  { sort, tag }: ItemListFilter,
  skip: number,
  take: number,
): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: itemListWhere(userId, typeId, tag),
    orderBy: itemListOrderBy(sort),
    skip,
    take,
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
}

// The tags the user put on items of this type, for the tag filter. Ordered
// here and not in the database, whose collation would put "React" before
// "api".
export async function getTypeTagNames(
  userId: string,
  typeId: string,
): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    where: { userId, items: { some: { item: { userId, typeId } } } },
    select: { name: true },
  });
  return tags.map(({ name }) => name).toSorted(compareNames);
}

// The items the command palette searches, last edited first. The content is
// read only to build the preview; it stays on the server.
export async function getSearchableItems(
  userId: string,
): Promise<SearchableItem[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: SEARCH_INDEX_ITEM_LIMIT,
    select: cardItemSelect,
  });
  return items.map(({ contentType, content, url, ...item }) => ({
    ...toDashboardItem(item),
    preview: toSearchPreview(copyValueOf({ contentType, content, url })),
  }));
}

export async function getItemEditState(
  userId: string,
  id: string,
): Promise<ItemEditState | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: {
      type: { select: { name: true } },
      collections: { select: { collectionId: true } },
    },
  });
  if (!item) return null;

  return {
    typeName: item.type.name,
    collectionIds: item.collections.map((row) => row.collectionId),
  };
}

export async function getItemStats(userId: string): Promise<ItemStats> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);
  return { total, favorites };
}
