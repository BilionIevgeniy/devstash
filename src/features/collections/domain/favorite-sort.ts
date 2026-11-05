import type { FavoriteCollection } from "@/features/collections/types";
import { compareNames } from "@/features/items/domain/favorite-sort";

export const FAVORITE_COLLECTION_SORTS = [
  "newest",
  "oldest",
  "a-z",
  "z-a",
] as const;

export type FavoriteCollectionSort = (typeof FAVORITE_COLLECTION_SORTS)[number];

function compareCollections(
  a: FavoriteCollection,
  b: FavoriteCollection,
  sort: FavoriteCollectionSort,
): number {
  switch (sort) {
    case "newest":
      return b.favoritedAt.getTime() - a.favoritedAt.getTime();
    case "oldest":
      return a.favoritedAt.getTime() - b.favoritedAt.getTime();
    case "a-z":
      return compareNames(a.name, b.name);
    case "z-a":
      return compareNames(b.name, a.name);
  }
}

// Ties keep the server's order in every sort, so Oldest is not an exact mirror
// of Newest for favorites starred at the same moment.
export function sortFavoriteCollections(
  collections: FavoriteCollection[],
  sort: FavoriteCollectionSort,
): FavoriteCollection[] {
  return collections.toSorted((a, b) => compareCollections(a, b, sort));
}
