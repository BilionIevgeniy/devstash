import type { FavoriteItem } from "@/features/items/types";

export const FAVORITE_SORTS = ["date", "name", "type"] as const;

export type FavoriteSort = (typeof FAVORITE_SORTS)[number];

// An explicit locale: the order must not depend on where the code runs.
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "en", { sensitivity: "base" });
}

// Types go by name, not by how many items they hold: removing one favorite must
// not make a whole group jump.
function compareItems(
  a: FavoriteItem,
  b: FavoriteItem,
  sort: FavoriteSort,
): number {
  if (sort === "date") return b.favoritedAt.getTime() - a.favoritedAt.getTime();
  if (sort === "name") return compareNames(a.title, b.title);
  return (
    compareNames(a.type.name, b.type.name) || compareNames(a.title, b.title)
  );
}

export function sortFavoriteItems(
  items: FavoriteItem[],
  sort: FavoriteSort,
): FavoriteItem[] {
  return items.toSorted((a, b) => compareItems(a, b, sort));
}
