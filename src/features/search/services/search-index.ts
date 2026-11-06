import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import { getSearchableCollections } from "@/features/collections/queries";
import { canUseType } from "@/features/items/domain/item-fields";
import { getSearchableItems } from "@/features/items/queries";
import type { SearchIndex } from "@/features/search/types";

export async function getSearchIndex(userId: string): Promise<SearchIndex> {
  const [items, collections, { isPro }] = await Promise.all([
    getSearchableItems(userId),
    getSearchableCollections(userId),
    getEntitlements(userId),
  ]);
  return {
    items: items.map((item) => ({
      ...item,
      isLocked: !canUseType(item.type.name, isPro),
    })),
    collections,
  };
}
