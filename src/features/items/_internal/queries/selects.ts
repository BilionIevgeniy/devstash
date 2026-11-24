import "server-only";

import { toItemTypeInfo } from "@/features/item-types/domain/item-type";
import { itemTypeSelect } from "@/features/item-types/queries";
import { copyValueOf } from "@/features/items/domain/item-fields";
import type { DashboardItem, ItemCardData } from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";

// The orders, selects and mappers the queries of items share: shapes, no reads
// (ADR 0017).

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

// An item's tags by name, each with its AI mark (ADR 0027).
export const itemTagsSelect = {
  select: { aiGenerated: true, tag: { select: { name: true } } },
  orderBy: { tag: { name: "asc" } },
} satisfies Prisma.Item$tagsArgs;

interface RawTagLink {
  aiGenerated: boolean;
  tag: { name: string };
}

// The one place the tag links become the names and the AI-marked names.
export function toTagFields(links: RawTagLink[]): {
  tags: string[];
  aiTags: string[];
} {
  return {
    tags: links.map(({ tag }) => tag.name),
    aiTags: links.filter((link) => link.aiGenerated).map(({ tag }) => tag.name),
  };
}

export const dashboardItemSelect = {
  id: true,
  title: true,
  description: true,
  descriptionAiGenerated: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  type: { select: itemTypeSelect },
  tags: itemTagsSelect,
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
    ...toTagFields(tags),
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
