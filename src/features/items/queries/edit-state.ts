import "server-only";

import {
  itemTagsSelect,
  toTagFields,
} from "@/features/items/_internal/queries/selects";
import type { ItemEditState } from "@/features/items/types";
import { prisma } from "@/lib/postgres/prisma";

export async function getItemEditState(
  userId: string,
  id: string,
): Promise<ItemEditState | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: {
      title: true,
      description: true,
      content: true,
      language: true,
      url: true,
      descriptionAiGenerated: true,
      contentAiGenerated: true,
      type: { select: { name: true } },
      collections: { select: { collectionId: true } },
      tags: itemTagsSelect,
    },
  });
  if (!item) return null;

  const { tags, aiTags } = toTagFields(item.tags);
  return {
    typeName: item.type.name,
    collectionIds: item.collections.map((row) => row.collectionId),
    text: {
      title: item.title,
      description: item.description,
      content: item.content,
      language: item.language,
      url: item.url,
      tags,
    },
    ai: {
      description: item.description,
      content: item.content,
      descriptionAiGenerated: item.descriptionAiGenerated,
      contentAiGenerated: item.contentAiGenerated,
      aiTags,
    },
  };
}
