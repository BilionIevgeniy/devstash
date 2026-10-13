import { mockItemTypes, mockItems } from "@/lib/mock-data";

export type Item = (typeof mockItems)[number];
export type ItemType = (typeof mockItemTypes)[number];

const RECENT_ITEMS_LIMIT = 10;

const itemTypesById = new Map(mockItemTypes.map((type) => [type.id, type]));

function byNewest<T extends { createdAt: Date }>(a: T, b: T) {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

export function getItemType(item: Item): ItemType {
  const type = itemTypesById.get(item.itemTypeId);
  if (!type) {
    throw new Error(`Unknown item type: ${item.itemTypeId}`);
  }
  return type;
}

export function getPinnedItems(): Item[] {
  return mockItems.filter((item) => item.isPinned).sort(byNewest);
}

export function getRecentItems(): Item[] {
  return [...mockItems].sort(byNewest).slice(0, RECENT_ITEMS_LIMIT);
}

export function getDashboardStats() {
  return {
    items: mockItems.length,
    favoriteItems: mockItems.filter((item) => item.isFavorite).length,
  };
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
