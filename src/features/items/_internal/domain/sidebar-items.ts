export const SIDEBAR_ITEMS_LIMIT = 5;

// Takes one row past the limit: that row only says that there are more.
export function limitSidebarFavorites<T>(rows: T[]): {
  favorites: T[];
  hasMoreFavorites: boolean;
} {
  return {
    favorites: rows.slice(0, SIDEBAR_ITEMS_LIMIT),
    hasMoreFavorites: rows.length > SIDEBAR_ITEMS_LIMIT,
  };
}
