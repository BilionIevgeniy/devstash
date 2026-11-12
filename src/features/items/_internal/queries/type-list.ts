import "server-only";

import {
  dashboardItemSelect,
  PINNED_FIRST,
  toDashboardItem,
} from "@/features/items/_internal/queries";
import type {
  ItemListFilter,
  ItemListSort,
} from "@/features/items/domain/list-params";
import type { UploadItemRecord } from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// The rows of a type page (ADR 0017): the where and the order its count, its
// cards and its uploads share, and the read of the uploads, which returns the
// object key and so stays private.

// A tag is matched by its exact name among the user's own tags.
export function itemListWhere(
  userId: string,
  typeId: string,
  tag: string | null,
): Prisma.ItemWhereInput {
  if (tag === null) return { userId, typeId };
  return { userId, typeId, tags: { some: { tag: { userId, name: tag } } } };
}

// Pins lead in every sort, as on every listing. The id settles equal values in
// the direction of the sort, so a row cannot move between pages. The title is
// collated "und-x-icu" (migration item_title_icu_collation), so A-Z goes by
// letter, not capitals first.
const ITEM_LIST_ORDER: Record<
  ItemListSort,
  Prisma.ItemOrderByWithRelationInput[]
> = {
  newest: PINNED_FIRST,
  oldest: [{ isPinned: "desc" }, { createdAt: "asc" }, { id: "asc" }],
  "a-z": [{ isPinned: "desc" }, { title: "asc" }, { id: "asc" }],
  "z-a": [{ isPinned: "desc" }, { title: "desc" }, { id: "desc" }],
};

export function itemListOrderBy(
  sort: ItemListSort,
): Prisma.ItemOrderByWithRelationInput[] {
  return ITEM_LIST_ORDER[sort];
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

// One page of a file or image type with its uploads, read only by the gallery
// and file list services. The page's position comes from the count the page
// read before.
export async function getUploadItemsOfType(
  userId: string,
  typeId: string,
  { sort, tag }: ItemListFilter,
  skip: number,
  take: number,
): Promise<UploadItemRecord[]> {
  const items = await prisma.item.findMany({
    where: itemListWhere(userId, typeId, tag),
    orderBy: itemListOrderBy(sort),
    skip,
    take,
    select: uploadItemSelect,
  });
  return items.map(toUploadItem);
}
