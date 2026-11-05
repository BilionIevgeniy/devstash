import type { FavoriteItem } from "@/features/items/types";

export const FAVORITE_ITEM_SORTS = [
  "newest",
  "oldest",
  "a-z",
  "z-a",
  "type",
] as const;

export type FavoriteItemSort = (typeof FAVORITE_ITEM_SORTS)[number];

// An explicit locale: the order must not depend on where the code runs.
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

// Types go by name, not by how many items they hold: removing one favorite must
// not make a whole group jump.
function compareItems(
  a: FavoriteItem,
  b: FavoriteItem,
  sort: FavoriteItemSort,
): number {
  switch (sort) {
    case "newest":
      return b.favoritedAt.getTime() - a.favoritedAt.getTime();
    case "oldest":
      return a.favoritedAt.getTime() - b.favoritedAt.getTime();
    case "a-z":
      return compareNames(a.title, b.title);
    case "z-a":
      return compareNames(b.title, a.title);
    case "type":
      return (
        compareNames(a.type.name, b.type.name) || compareNames(a.title, b.title)
      );
  }
}

// Ties keep the server's order in every sort, so Oldest is not an exact mirror
// of Newest for favorites starred at the same moment.
export function sortFavoriteItems(
  items: FavoriteItem[],
  sort: FavoriteItemSort,
): FavoriteItem[] {
  return items.toSorted((a, b) => compareItems(a, b, sort));
}
