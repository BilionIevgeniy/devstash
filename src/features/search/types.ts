import type { SearchableCollection } from "@/features/collections/types";
import type { SearchableItem } from "@/features/items/types";

// An item of the index: the plan decides here, since the palette has no plan of
// its own and the index is read again each time it opens.
export interface IndexedItem extends SearchableItem {
  isLocked: boolean;
}

export interface SearchIndex {
  items: IndexedItem[];
  collections: SearchableCollection[];
}

export type SearchableItemJson = Omit<IndexedItem, "createdAt"> & {
  createdAt: string;
};

// The index as GET /api/search sends it.
export interface SearchIndexJson {
  items: SearchableItemJson[];
  collections: SearchableCollection[];
}
