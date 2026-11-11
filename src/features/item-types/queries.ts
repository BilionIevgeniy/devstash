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

// System types only, shared by every user, so no owner in the where. When
// custom types arrive, a lookup by name must add the caller (see "Known risks"
// in docs/architecture.md).
export async function getItemTypeByName(
  name: string,
): Promise<ItemTypeInfo | null> {
  const type = await prisma.itemType.findFirst({
    where: { name, isSystem: true },
    select: itemTypeSelect,
  });
  return type ? toItemTypeInfo(type) : null;
}

// The shared system types, and the caller's own types once custom types exist:
// someone else's custom type is never read, whatever ids come in.
export async function getItemTypesById(
  userId: string,
  typeIds: string[],
): Promise<Map<string, ItemTypeInfo>> {
  const types = await prisma.itemType.findMany({
    where: { id: { in: typeIds }, OR: [{ isSystem: true }, { userId }] },
    select: itemTypeSelect,
  });

  return new Map(types.map((type) => [type.id, toItemTypeInfo(type)]));
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
