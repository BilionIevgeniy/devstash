import type { DashboardItem } from "@/features/items/types";

// The fields every row and card shows, named one by one: what a record holds
// besides (the object key, the file) is left behind.
export function toRowFields(item: DashboardItem): DashboardItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    descriptionAiGenerated: item.descriptionAiGenerated,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    createdAt: item.createdAt,
    tags: item.tags,
    aiTags: item.aiTags,
    type: item.type,
  };
}
