import "server-only";

import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import { copyValueOf } from "@/features/items/domain/item-fields";
import { ITEMS_PER_PAGE } from "@/features/items/domain/pagination";
import type {
  CollectionItemRecord,
  DashboardItem,
  ItemCardData,
  ItemDetailRecord,
  LockedFileRecord,
} from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { type Paginated, readPage } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

// The reads that hand out the object key, which never leaves the server, and
// the selects and mappers they share with the public queries. The type counts
// of a collection are here too, for the where they share with its records.

// The id settles equal dates, so a row cannot move between pages.
export const NEWEST_FIRST = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.ItemOrderByWithRelationInput[];

// The order of the listings: type pages and collections.
export const PINNED_FIRST = [
  { isPinned: "desc" },
  ...NEWEST_FIRST,
] satisfies Prisma.ItemOrderByWithRelationInput[];

export const dashboardItemSelect = {
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

export function toDashboardItem({
  type,
  tags,
  ...item
}: RawItem): DashboardItem {
  return {
    ...item,
    type: toItemTypeInfo(type),
    tags: tags.map(({ tag }) => tag.name),
  };
}

export const cardItemSelect = {
  ...dashboardItemSelect,
  contentType: true,
  content: true,
  url: true,
} satisfies Prisma.ItemSelect;

type RawCardItem = Prisma.ItemGetPayload<{ select: typeof cardItemSelect }>;

// The content is read only to tell whether there is something to copy; it
// stays on the server, and the copy button fetches it on click.
export function toItemCardData({
  contentType,
  content,
  url,
  ...item
}: RawCardItem): ItemCardData {
  return {
    ...toDashboardItem(item),
    canCopy: copyValueOf({ contentType, content, url }) !== null,
  };
}

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

const itemDetailSelect = {
  ...dashboardItemSelect,
  contentType: true,
  content: true,
  url: true,
  fileKey: true,
  fileName: true,
  fileSize: true,
  language: true,
  updatedAt: true,
  collections: {
    select: { collection: { select: { id: true, name: true } } },
    orderBy: { collection: { name: "asc" } },
  },
} satisfies Prisma.ItemSelect;

type RawItemDetail = Prisma.ItemGetPayload<{
  select: typeof itemDetailSelect;
}>;

function toItemDetail({
  type,
  tags,
  collections,
  ...item
}: RawItemDetail): ItemDetailRecord {
  return {
    ...item,
    type: toItemTypeInfo(type),
    tags: tags.map(({ tag }) => tag.name),
    collections: collections.map(({ collection }) => collection),
  };
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

export async function getItemDetail(
  userId: string,
  id: string,
): Promise<ItemDetailRecord | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: itemDetailSelect,
  });
  return item ? toItemDetail(item) : null;
}

// The item routes carry the type in the URL: an item of another type is not
// found there, the same as a missing one.
export async function getItemDetailOfType(
  userId: string,
  id: string,
  typeName: string,
): Promise<ItemDetailRecord | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId, type: { name: typeName } },
    select: itemDetailSelect,
  });
  return item ? toItemDetail(item) : null;
}

// An object and not the bare key: a missing item (null) and an item with no
// file ({ fileKey: null }) are different answers to the delete service.
export async function getItemFileKey(
  userId: string,
  id: string,
): Promise<{ fileKey: string | null } | null> {
  return prisma.item.findFirst({
    where: { id, userId },
    select: { fileKey: true },
  });
}

function fileItemsOf(userId: string) {
  return { userId, fileKey: { not: null } } satisfies Prisma.ItemWhereInput;
}

export function countFileItems(userId: string): Promise<number> {
  return prisma.item.count({ where: fileItemsOf(userId) });
}

// Every item with an upload, newest first, read only by the locked files service.
export function getFileItemRecords(
  userId: string,
  page: number,
): Promise<Paginated<LockedFileRecord>> {
  return readPage(
    page,
    ITEMS_PER_PAGE,
    () => countFileItems(userId),
    (skip, take) =>
      prisma.item.findMany({
        where: fileItemsOf(userId),
        orderBy: NEWEST_FIRST,
        skip,
        take,
        select: {
          id: true,
          title: true,
          fileKey: true,
          fileName: true,
          fileSize: true,
        },
      }),
  );
}
