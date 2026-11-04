import type { SearchableCollection } from "@/features/collections/types";
import type { SearchableItem } from "@/features/items/types";

export interface SearchIndex {
  items: SearchableItem[];
  collections: SearchableCollection[];
}

export type SearchableItemJson = Omit<SearchableItem, "createdAt"> & {
  createdAt: string;
};

// The index as GET /api/search sends it.
export interface SearchIndexJson {
  items: SearchableItemJson[];
  collections: SearchableCollection[];
}
