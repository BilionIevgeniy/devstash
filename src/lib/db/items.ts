import type { Prisma } from "@/generated/prisma/client";
import { DEMO_USER_EMAIL } from "@/lib/db/demo-user";
import { prisma } from "@/lib/prisma";
import type { DashboardItem, ItemStats } from "@/types/items";

const DEFAULT_TYPE_ICON = "File";
const RECENT_ITEMS_LIMIT = 20;

const demoUserItems = { user: { email: DEMO_USER_EMAIL } };

const dashboardItemSelect = {
  id: true,
  title: true,
  description: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  type: { select: { id: true, name: true, icon: true, color: true } },
  tags: {
    select: { tag: { select: { name: true } } },
    orderBy: { tag: { name: "asc" } },
  },
} satisfies Prisma.ItemSelect;

type RawItem = Prisma.ItemGetPayload<{ select: typeof dashboardItemSelect }>;

function toDashboardItem({ type, tags, ...item }: RawItem): DashboardItem {
  return {
    ...item,
    type: {
      id: type.id,
      name: type.name,
      icon: type.icon ?? DEFAULT_TYPE_ICON,
      color: type.color ?? undefined,
    },
    tags: tags.map(({ tag }) => tag.name),
  };
}

export async function getPinnedItems(): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { ...demoUserItems, isPinned: true },
    orderBy: { createdAt: "desc" },
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

export async function getRecentItems(): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: demoUserItems,
    orderBy: { createdAt: "desc" },
    take: RECENT_ITEMS_LIMIT,
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

export async function getItemStats(): Promise<ItemStats> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: demoUserItems }),
    prisma.item.count({ where: { ...demoUserItems, isFavorite: true } }),
  ]);
  return { total, favorites };
}
