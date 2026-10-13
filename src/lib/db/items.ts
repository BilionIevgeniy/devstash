import type { Prisma } from "@/generated/prisma/client";
import { DEMO_USER_EMAIL } from "@/lib/db/demo-user";
import { prisma } from "@/lib/prisma";
import type {
  DashboardItem,
  ItemStats,
  ItemTypeInfo,
  SidebarItemType,
} from "@/types/items";

const DEFAULT_TYPE_ICON = "File";
const RECENT_ITEMS_LIMIT = 20;
const SYSTEM_TYPE_ORDER = [
  "snippet",
  "prompt",
  "command",
  "note",
  "file",
  "image",
  "link",
];

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

interface RawItemType {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

function toItemTypeInfo(type: RawItemType): ItemTypeInfo {
  return {
    id: type.id,
    name: type.name,
    icon: type.icon ?? DEFAULT_TYPE_ICON,
    color: type.color ?? undefined,
  };
}

function toDashboardItem({ type, tags, ...item }: RawItem): DashboardItem {
  return {
    ...item,
    type: toItemTypeInfo(type),
    tags: tags.map(({ tag }) => tag.name),
  };
}

function systemTypePosition(name: string): number {
  const index = SYSTEM_TYPE_ORDER.indexOf(name);
  return index === -1 ? SYSTEM_TYPE_ORDER.length : index;
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

export async function getSidebarItemTypes(): Promise<SidebarItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      _count: { select: { items: { where: demoUserItems } } },
    },
  });

  return types
    .map(({ _count, ...type }) => ({
      ...toItemTypeInfo(type),
      itemCount: _count.items,
    }))
    .sort((a, b) => systemTypePosition(a.name) - systemTypePosition(b.name));
}
