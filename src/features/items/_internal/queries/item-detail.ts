import "server-only";

import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import {
  dashboardItemSelect,
  toTagFields,
} from "@/features/items/_internal/queries/selects";
import type { ItemDetailRecord } from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

// The reads of one item that hand out the object key, which never leaves the
// server.

const itemDetailSelect = {
  ...dashboardItemSelect,
  contentType: true,
  content: true,
  url: true,
  fileKey: true,
  fileName: true,
  fileSize: true,
  language: true,
  contentAiGenerated: true,
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
    ...toTagFields(tags),
    collections: collections.map(({ collection }) => collection),
  };
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
  typeSlug: string,
): Promise<ItemDetailRecord | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId, type: { slug: typeSlug } },
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
