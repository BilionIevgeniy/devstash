import "server-only";

import { getSearchableCollections } from "@/features/collections/queries";
import { getSearchableItems } from "@/features/items/queries";
import type { SearchIndex } from "@/features/search/types";

export async function getSearchIndex(userId: string): Promise<SearchIndex> {
  const [items, collections] = await Promise.all([
    getSearchableItems(userId),
    getSearchableCollections(userId),
  ]);
  return { items, collections };
}
