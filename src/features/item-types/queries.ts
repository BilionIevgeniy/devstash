import "server-only";

import { cache } from "react";

import { sameTypeName } from "@/features/item-types/domain/custom-type";
import {
  isSystemTypeName,
  sortBySystemOrder,
  toItemTypeInfo,
  type ItemTypeRow,
} from "@/features/item-types/domain/item-type";
import type {
  CustomTypeRow,
  ExportedCustomType,
  ItemTypeInfo,
  SidebarItemType,
} from "@/features/item-types/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";
import { compareNames } from "@/lib/utils";

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
// create items of someone else's type. The case is compared here with
// sameTypeName, as the service does under its lock: Prisma's case-insensitive
// equals is an ILIKE, where `_` and `%` match any character.
export async function getUserItemTypeByName(
  userId: string,
  name: string,
): Promise<ItemTypeInfo | null> {
  const candidates = await prisma.itemType.findMany({
    where: {
      OR: [
        { isSystem: true, userId: null, name },
        { userId, isSystem: false },
      ],
    },
    select: { ...itemTypeSelect, isSystem: true },
  });
  const type =
    candidates.find((row) => row.isSystem) ??
    candidates.find((row) => sameTypeName(row.name, name));
  return type ? toItemTypeInfo(type) : null;
}

// The type of a type page: a system type, or the caller's own custom type.
// Another user's type of the same slug is never read.
// cache() shares the read between the page and its title.
export const getItemTypeBySlug = cache(async function getItemTypeBySlug(
  userId: string,
  slug: string,
): Promise<ItemTypeInfo | null> {
  const type = await prisma.itemType.findFirst({
    where: { slug, OR: [{ isSystem: true, userId: null }, { userId }] },
    select: itemTypeSelect,
  });
  return type ? toItemTypeInfo(type) : null;
});

// The shared system types and the caller's own: someone else's custom type is
// never read, whatever ids come in.
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

// Rows read with their item count, as the lists show them, by name.
function withItemCounts(
  rows: (ItemTypeRow & { _count: { items: number } })[],
): SidebarItemType[] {
  return rows
    .map(({ _count, ...type }) => ({
      ...toItemTypeInfo(type),
      itemCount: _count.items,
    }))
    .toSorted((a, b) => compareNames(a.name, b.name));
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

    return sortBySystemOrder(withItemCounts(types));
  },
);

// The names of the caller's custom types, by name, for the create dialog:
// read from the sidebar's list, which cache() shares within the request.
export async function getCustomTypeNames(userId: string): Promise<string[]> {
  const types = await getSidebarItemTypes(userId);
  return types
    .filter((type) => !isSystemTypeName(type.name))
    .map((type) => type.name);
}

// The settings list of the caller's custom types, by name.
export async function getCustomTypes(userId: string): Promise<CustomTypeRow[]> {
  const types = await prisma.itemType.findMany({
    where: { userId, isSystem: false },
    select: {
      ...itemTypeSelect,
      _count: { select: { items: true } },
    },
  });
  return withItemCounts(types);
}

// The caller's custom types for the export, by name.
export async function getExportCustomTypes(
  userId: string,
): Promise<ExportedCustomType[]> {
  const types = await prisma.itemType.findMany({
    where: { userId, isSystem: false },
    select: { name: true, icon: true, color: true },
  });
  return types.toSorted((a, b) => compareNames(a.name, b.name));
}
