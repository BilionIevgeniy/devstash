import "server-only";

import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import type {
  DashboardItem,
  GalleryItemRecord,
  ItemDetailRecord,
  ItemStats,
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

const galleryItemSelect = {
  ...dashboardItemSelect,
  fileKey: true,
  fileName: true,
} satisfies Prisma.ItemSelect;

type RawGalleryItem = Prisma.ItemGetPayload<{
  select: typeof galleryItemSelect;
}>;

function toGalleryItem({
  fileKey,
  fileName,
  ...item
}: RawGalleryItem): GalleryItemRecord {
  return { ...toDashboardItem(item), fileKey, fileName };
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

export async function getPinnedItems(userId: string): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { createdAt: "desc" },
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

export async function getRecentItems(userId: string): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: RECENT_ITEMS_LIMIT,
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

export async function getItemsByType(
  userId: string,
  typeId: string,
): Promise<DashboardItem[]> {
  const items = await prisma.item.findMany({
    where: { userId, typeId },
    orderBy: { createdAt: "desc" },
    select: dashboardItemSelect,
  });
  return items.map(toDashboardItem);
}

// The items of an image type with their object keys, read only by the gallery
// service.
export async function getGalleryItemsByType(
  userId: string,
  typeId: string,
): Promise<GalleryItemRecord[]> {
  const items = await prisma.item.findMany({
    where: { userId, typeId },
    orderBy: { createdAt: "desc" },
    select: galleryItemSelect,
  });
  return items.map(toGalleryItem);
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
