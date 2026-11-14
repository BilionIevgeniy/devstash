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
