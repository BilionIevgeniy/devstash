import "server-only";

import {
  cardItemSelect,
  NEWEST_FIRST,
  toItemCardData,
} from "@/features/items/_internal/queries/selects";
import { FREE_ITEM_LIMIT } from "@/features/billing/domain/limits";
import type { ItemCardData, ItemStats } from "@/features/items/types";
import { prisma } from "@/lib/postgres/prisma";

const DASHBOARD_RECENT_ITEMS_LIMIT = 10;
// A Free user can pin all of their items.
const DASHBOARD_PINNED_ITEMS_LIMIT = FREE_ITEM_LIMIT;

export async function getPinnedItems(userId: string): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: NEWEST_FIRST,
    take: DASHBOARD_PINNED_ITEMS_LIMIT,
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

/** How many items the user has, for the text lock over the Free limit. */
export async function getItemCount(userId: string): Promise<number> {
  return prisma.item.count({ where: { userId } });
}

export async function getItemStats(userId: string): Promise<ItemStats> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);
  return { total, favorites };
}
