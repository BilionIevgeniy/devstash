import "server-only";

import {
  cardItemSelect,
  toItemCardData,
} from "@/features/items/_internal/queries/selects";
import {
  itemListOrderBy,
  itemListWhere,
} from "@/features/items/_internal/queries/type-list";
import type { ItemListFilter } from "@/features/items/domain/list/list-params";
import type { ItemCardData } from "@/features/items/types";
import { prisma } from "@/lib/postgres/prisma";
import { compareNames } from "@/lib/utils";

// The rows of a type page with a sort and a tag (feature 7). The page reads
// the count first and works out its position from it, so the count and the
// rows are read once each.
export function countItemsOfType(
  userId: string,
  typeId: string,
  tag: string | null,
): Promise<number> {
  return prisma.item.count({ where: itemListWhere(userId, typeId, tag) });
}

export async function getItemsOfType(
  userId: string,
  typeId: string,
  { sort, tag }: ItemListFilter,
  skip: number,
  take: number,
): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: itemListWhere(userId, typeId, tag),
    orderBy: itemListOrderBy(sort),
    skip,
    take,
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
}

// The tags the user put on items of this type, for the tag filter. Ordered
// here and not in the database, whose collation would put "React" before
// "api".
export async function getTypeTagNames(
  userId: string,
  typeId: string,
): Promise<string[]> {
  const tags = await prisma.tag.findMany({
    where: { userId, items: { some: { item: { userId, typeId } } } },
    select: { name: true },
  });
  return tags.map(({ name }) => name).toSorted(compareNames);
}
