import type { SearchableCollection } from "@/features/collections/types";
import type { SearchableItem } from "@/features/items/types";

// An item of the palette: the plan decides here, since the palette has no plan
// of its own and every answer is read fresh.
export interface PaletteItem extends SearchableItem {
  isLocked: boolean;
}

// One answer of GET /api/search: a page of matches, or the recent list for an
// empty query. Collections come with the first page only.
export interface PaletteResults {
  items: PaletteItem[];
  collections: SearchableCollection[];
  /** The cursor of the next page of items, or null on the last one. */
  nextCursor: string | null;
}

export type PaletteItemJson = Omit<PaletteItem, "createdAt"> & {
  createdAt: string;
};

// The answer as GET /api/search sends it.
export interface PaletteResultsJson extends Omit<PaletteResults, "items"> {
  items: PaletteItemJson[];
}
