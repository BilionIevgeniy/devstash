import "server-only";

import {
  cardItemSelect,
  PINNED_FIRST,
  toItemCardData,
} from "@/features/items/_internal/queries/selects";
import type { CollectionItemRecord } from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

// The items of a collection with their object keys, which never leave the
// server, and the type counts, for the where they share.

const collectionItemSelect = {
  ...cardItemSelect,
  fileKey: true,
  fileName: true,
  fileSize: true,
} satisfies Prisma.ItemSelect;

type RawCollectionItem = Prisma.ItemGetPayload<{
  select: typeof collectionItemSelect;
}>;

function toCollectionItemRecord({
  fileKey,
  fileName,
  fileSize,
  ...item
}: RawCollectionItem): CollectionItemRecord {
  return { ...toItemCardData(item), fileKey, fileName, fileSize };
}

function collectionItemsWhere(
  userId: string,
  collectionId: string,
): Prisma.ItemWhereInput {
  return { userId, collections: { some: { collectionId } } };
}

// How many items of each type the collection holds, by type id.
export async function getCollectionTypeCounts(
  userId: string,
  collectionId: string,
): Promise<Map<string, number>> {
  const groups = await prisma.item.groupBy({
    by: ["typeId"],
    where: collectionItemsWhere(userId, collectionId),
    _count: { _all: true },
  });
  return new Map(groups.map(({ typeId, _count }) => [typeId, _count._all]));
}

// One page of a collection's items with their uploads, read only by the
// collection listing service.
export async function getCollectionItemRecords(
  userId: string,
  collectionId: string,
  skip: number,
  take: number,
): Promise<CollectionItemRecord[]> {
  const items = await prisma.item.findMany({
    where: collectionItemsWhere(userId, collectionId),
    orderBy: PINNED_FIRST,
    skip,
    take,
    select: collectionItemSelect,
  });
  return items.map(toCollectionItemRecord);
}
