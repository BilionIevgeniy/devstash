import { mockCollections, mockItemTypes, mockItems } from "@/lib/mock-data";

export type Item = (typeof mockItems)[number];
export type ItemType = (typeof mockItemTypes)[number];
export type Collection = (typeof mockCollections)[number];

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

/** Distinct item types in a collection, most frequent first (ties keep item order). */
export function getCollectionTypes(collectionId: string): ItemType[] {
  const counts = new Map<ItemType, number>();
  for (const item of mockItems) {
    if (item.collectionId !== collectionId) continue;
    const type = getItemType(item);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([type]) => type);
}

export function getRecentCollections(): Collection[] {
  return [...mockCollections].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
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
    collections: mockCollections.length,
    favoriteItems: mockItems.filter((item) => item.isFavorite).length,
    favoriteCollections: mockCollections.filter(
      (collection) => collection.isFavorite,
    ).length,
  };
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
