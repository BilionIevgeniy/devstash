import "server-only";

import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import { copyValueOf } from "@/features/items/domain/item-fields";
import type {
  DashboardItem,
  ItemCardData,
  ItemDetailRecord,
  ItemStats,
  UploadItemRecord,
} from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const RECENT_ITEMS_LIMIT = 20;

const dashboardItemSelect = {
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

function toDashboardItem({ type, tags, ...item }: RawItem): DashboardItem {
  return {
    ...item,
    type: toItemTypeInfo(type),
    tags: tags.map(({ tag }) => tag.name),
  };
}

const cardItemSelect = {
  ...dashboardItemSelect,
  contentType: true,
  content: true,
  url: true,
} satisfies Prisma.ItemSelect;

type RawCardItem = Prisma.ItemGetPayload<{ select: typeof cardItemSelect }>;

function toItemCardData({
  contentType,
  content,
  url,
  ...item
}: RawCardItem): ItemCardData {
  return {
    ...toDashboardItem(item),
    copyValue: copyValueOf({ contentType, content, url }),
  };
}

const uploadItemSelect = {
  ...dashboardItemSelect,
  fileKey: true,
  fileName: true,
  fileSize: true,
} satisfies Prisma.ItemSelect;

type RawUploadItem = Prisma.ItemGetPayload<{
  select: typeof uploadItemSelect;
}>;

function toUploadItem({
  fileKey,
  fileName,
  fileSize,
  ...item
}: RawUploadItem): UploadItemRecord {
  return { ...toDashboardItem(item), fileKey, fileName, fileSize };
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

export async function getPinnedItems(userId: string): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { createdAt: "desc" },
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
}

export async function getRecentItems(userId: string): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: RECENT_ITEMS_LIMIT,
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
}

export async function getItemsByType(
  userId: string,
  typeId: string,
): Promise<ItemCardData[]> {
  const items = await prisma.item.findMany({
    where: { userId, typeId },
    orderBy: { createdAt: "desc" },
    select: cardItemSelect,
  });
  return items.map(toItemCardData);
}

// The items of a file or image type with their uploads, read only by the
// gallery and file list services.
export async function getUploadItemsByType(
  userId: string,
  typeId: string,
): Promise<UploadItemRecord[]> {
  const items = await prisma.item.findMany({
    where: { userId, typeId },
    orderBy: { createdAt: "desc" },
    select: uploadItemSelect,
  });
  return items.map(toUploadItem);
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

export async function getItemStats(userId: string): Promise<ItemStats> {
  const [total, favorites] = await Promise.all([
    prisma.item.count({ where: { userId } }),
    prisma.item.count({ where: { userId, isFavorite: true } }),
  ]);
  return { total, favorites };
}
