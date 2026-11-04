import "server-only";

import { toSearchPreview } from "@/features/items/_internal/domain/search-preview";
import {
  cardItemSelect,
  NEWEST_FIRST,
  toDashboardItem,
  toItemCardData,
} from "@/features/items/_internal/queries";
import { copyValueOf } from "@/features/items/domain/item-fields";
import { ITEMS_PER_PAGE } from "@/features/items/domain/pagination";
import type {
  ItemCardData,
  ItemEditState,
  ItemStats,
  SearchableItem,
} from "@/features/items/types";
import { type Paginated, readPage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

const DASHBOARD_RECENT_ITEMS_LIMIT = 10;
const SEARCH_INDEX_ITEM_LIMIT = 1000;

export async function getPinnedItems(userId: string): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { createdAt: "desc" },
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
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

export function getItemsByType(
  userId: string,
  typeId: string,
  page: number,
): Promise<Paginated<ItemCardData>> {
  const where = { userId, typeId };

  return readPage(
    page,
    ITEMS_PER_PAGE,
    () => prisma.item.count({ where }),
    async (skip, take) => {
      const items = await prisma.item.findMany({
        where,
        orderBy: NEWEST_FIRST,
        skip,
        take,
        select: cardItemSelect,
      });
      return items.map(toItemCardData);
    },
  );
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
