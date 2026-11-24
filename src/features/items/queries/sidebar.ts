import "server-only";

import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import { NEWEST_FIRST } from "@/features/items/_internal/queries/selects";
import {
  limitSidebarRows,
  SIDEBAR_ITEMS_LIMIT,
} from "@/features/items/domain/sidebar-items";
import type { SidebarItem, SidebarItems } from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

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
