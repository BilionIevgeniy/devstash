import type { FavoriteCollection } from "@/features/collections/types";
import {
  compareNames,
  type FavoriteSort,
} from "@/features/items/domain/favorite-sort";

// A collection has no type, so the type sort lists them by name.
export function sortFavoriteCollections(
  collections: FavoriteCollection[],
  sort: FavoriteSort,
): FavoriteCollection[] {
  return collections.toSorted((a, b) =>
    sort === "date"
      ? b.favoritedAt.getTime() - a.favoritedAt.getTime()
      : compareNames(a.name, b.name),
  );
}
