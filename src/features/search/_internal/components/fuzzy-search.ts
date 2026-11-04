import Fuse from "fuse.js";

import type { SearchIndex } from "@/features/search/types";

const ITEM_RESULT_LIMIT = 8;
const COLLECTION_RESULT_LIMIT = 5;

// threshold: about errors per letter of the query, so a query of up to 4 letters
// must match exactly and 5 or more allow a typo. Any looser and "test" finds
// "text", or "tes T" in "Notes Template".
// ignoreLocation: a match late in a long preview counts like an early one.
const FUSE_OPTIONS = { threshold: 0.2, ignoreLocation: true };

export type PaletteSearch = (query: string) => SearchIndex;

// Builds the search once per index; the function it returns runs per keystroke.
// An empty query shows the latest of each group.
export function createPaletteSearch({
  items,
  collections,
}: SearchIndex): PaletteSearch {
  const itemSearch = new Fuse(items, {
    ...FUSE_OPTIONS,
    keys: [
      { name: "title", weight: 3 },
      { name: "tags", weight: 2 },
      { name: "type.name", weight: 1 },
      { name: "description", weight: 1 },
      { name: "preview", weight: 1 },
    ],
  });
  const collectionSearch = new Fuse(collections, {
    ...FUSE_OPTIONS,
    keys: ["name"],
  });

  return function search(query) {
    const text = query.trim();
    if (text === "") {
      return {
        items: items.slice(0, ITEM_RESULT_LIMIT),
        collections: collections.slice(0, COLLECTION_RESULT_LIMIT),
      };
    }

    return {
      items: itemSearch
        .search(text, { limit: ITEM_RESULT_LIMIT })
        .map(({ item }) => item),
      collections: collectionSearch
        .search(text, { limit: COLLECTION_RESULT_LIMIT })
        .map(({ item }) => item),
    };
  };
}
