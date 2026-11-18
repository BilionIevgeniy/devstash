import "server-only";

import { cache } from "react";

import {
  sortBySystemOrder,
  toItemTypeInfo,
} from "@/features/item-types/domain/item-type";
import type {
  CustomTypeRow,
  ItemTypeInfo,
  SidebarItemType,
} from "@/features/item-types/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

export const itemTypeSelect = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  color: true,
} satisfies Prisma.ItemTypeSelect;

// The type an item names: a system type by its exact name, else the caller's
// own custom type, whatever the case. A custom name is never a system name
// (isReservedTypeName), and another user's type is never read, so nobody can
// create items of someone else's type.
export async function getUserItemTypeByName(
  userId: string,
  name: string,
): Promise<ItemTypeInfo | null> {
  const type = await prisma.itemType.findFirst({
    where: {
      OR: [
        { isSystem: true, userId: null, name },
        {
          userId,
          isSystem: false,
          name: { equals: name, mode: "insensitive" },
        },
      ],
    },
    select: itemTypeSelect,
  });
  return type ? toItemTypeInfo(type) : null;
}

// The type of a type page: a system type, or the caller's own custom type.
// Another user's type of the same slug is never read.
export async function getItemTypeBySlug(
  userId: string,
  slug: string,
): Promise<ItemTypeInfo | null> {
  const type = await prisma.itemType.findFirst({
    where: { slug, OR: [{ isSystem: true, userId: null }, { userId }] },
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

// The system types in their order, then the caller's own types by name, each
// with the caller's item count. cache(): the sidebar, the create button and
// the profile read it in one request.
export const getSidebarItemTypes = cache(
  async (userId: string): Promise<SidebarItemType[]> => {
    const types = await prisma.itemType.findMany({
      where: { OR: [{ isSystem: true, userId: null }, { userId }] },
      select: {
        ...itemTypeSelect,
        _count: { select: { items: { where: { userId } } } },
      },
    });

    return sortBySystemOrder(
      types
        .map(({ _count, ...type }) => ({
          ...toItemTypeInfo(type),
          itemCount: _count.items,
        }))
        .toSorted((a, b) => a.name.localeCompare(b.name)),
    );
  },
);

// The settings list of the caller's custom types, by name.
export async function getCustomTypes(userId: string): Promise<CustomTypeRow[]> {
  const types = await prisma.itemType.findMany({
    where: { userId, isSystem: false },
    select: {
      ...itemTypeSelect,
      _count: { select: { items: true } },
    },
  });
  return types
    .map(({ _count, ...type }) => ({
      ...toItemTypeInfo(type),
      itemCount: _count.items,
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}
