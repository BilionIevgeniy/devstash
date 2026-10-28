import "server-only";

import {
  sortBySystemOrder,
  toItemTypeInfo,
} from "@/features/item-types/domain/item-type";
import type {
  ItemTypeInfo,
  SidebarItemType,
} from "@/features/item-types/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const itemTypeSelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
} satisfies Prisma.ItemTypeSelect;

export async function getItemTypeByName(
  name: string,
): Promise<ItemTypeInfo | null> {
  const type = await prisma.itemType.findFirst({
    where: { name, isSystem: true },
    select: itemTypeSelect,
  });
  return type ? toItemTypeInfo(type) : null;
}

export async function getSidebarItemTypes(
  userId: string,
): Promise<SidebarItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: {
      ...itemTypeSelect,
      _count: { select: { items: { where: { userId } } } },
    },
  });

  return sortBySystemOrder(
    types.map(({ _count, ...type }) => ({
      ...toItemTypeInfo(type),
      itemCount: _count.items,
    })),
  );
}
