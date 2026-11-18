export const FAVORITE_ITEM_SORTS = [
  "newest",
  "oldest",
  "a-z",
  "z-a",
  "type",
] as const;

export type FavoriteItemSort = (typeof FAVORITE_ITEM_SORTS)[number];
