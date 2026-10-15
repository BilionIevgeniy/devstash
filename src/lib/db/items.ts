import type { Prisma } from "@/generated/prisma/client";
import { DEMO_USER_FILTER } from "@/lib/db/demo-user";
import { itemTypeSelect, toItemTypeInfo } from "@/lib/db/item-types";
import { prisma } from "@/lib/prisma";
import type { DashboardItem, ItemStats } from "@/types/items";

const RECENT_ITEMS_LIMIT = 20;

const dashboardItemSelect = {
  id: true,
  title: true,
  description: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  type: { select: itemTypeSelect },
  tags: {
    select: { tag: { select: { name: true } } },
    orderBy: { tag: { name: "asc" } },
  },
} satisfies Prisma.ItemSelect;

type RawItem = Prisma.ItemGetPayload<{ select: typeof dashboardItemSelect }>;

function toDashboardItem({ type, tags, ...item }: RawItem): DashboardItem {
  return {
    ...item,
    type: toItemTypeInfo(type),
    tags: tags.map(({ tag }) => tag.name),
  };
}

export async function getPinnedItems(): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { ...DEMO_USER_FILTER, isPinned: true },
    orderBy: { createdAt: "desc" },
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

export async function getRecentItems(): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: DEMO_USER_FILTER,
    orderBy: { createdAt: "desc" },
    take: RECENT_ITEMS_LIMIT,
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

export async function getItemStats(): Promise<ItemStats> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: DEMO_USER_FILTER }),
    prisma.item.count({ where: { ...DEMO_USER_FILTER, isFavorite: true } }),
  ]);
  return { total, favorites };
}
