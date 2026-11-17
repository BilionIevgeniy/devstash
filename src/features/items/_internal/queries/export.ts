import "server-only";

import {
  itemTagsSelect,
  toTagFields,
} from "@/features/items/_internal/queries";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/postgres/prisma";

// The pages of an export. They carry the object key, so they stay here and
// only the export service reads them (ADR 0010).

const exportItemSelect = {
  id: true,
  title: true,
  description: true,
  content: true,
  url: true,
  language: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  fileKey: true,
  fileName: true,
  fileSize: true,
  type: { select: { name: true } },
  descriptionAiGenerated: true,
  contentAiGenerated: true,
  tags: itemTagsSelect,
  collections: {
    select: { collectionId: true },
    orderBy: { collectionId: "asc" },
  },
} satisfies Prisma.ItemSelect;

type RawExportItem = Prisma.ItemGetPayload<{
  select: typeof exportItemSelect;
}>;

export interface ExportItemRow extends Omit<
  RawExportItem,
  "type" | "tags" | "collections"
> {
  type: string;
  tags: string[];
  aiTags: string[];
  collectionIds: string[];
}

export interface ExportItemRows {
  rows: ExportItemRow[];
  /** The id to read the next page after, or null on the last page. */
  nextCursor: string | null;
}

function toExportItemRow({
  type,
  tags,
  collections,
  ...item
}: RawExportItem): ExportItemRow {
  return {
    ...item,
    type: type.name,
    ...toTagFields(tags),
    collectionIds: collections.map(({ collectionId }) => collectionId),
  };
}

// Keyset pages by id: a row deleted or added during the export cannot shift
// the pages after it. One row more than the page tells whether another exists.
export async function getExportItemRows(
  userId: string,
  cursor: string | null,
  take: number,
): Promise<ExportItemRows> {
  const items = await prisma.item.findMany({
    where: { userId, ...(cursor !== null && { id: { gt: cursor } }) },
    orderBy: { id: "asc" },
    take: take + 1,
    select: exportItemSelect,
  });
  const rows = items.slice(0, take).map(toExportItemRow);
  const nextCursor = items.length > take ? rows[rows.length - 1].id : null;
  return { rows, nextCursor };
}
