export const SIDEBAR_ITEMS_LIMIT = 5;

// Takes one row past the limit: that row only says that there are more.
export function limitSidebarRows<T>(rows: T[]): {
  rows: T[];
  hasMore: boolean;
} {
  return {
    rows: rows.slice(0, SIDEBAR_ITEMS_LIMIT),
    hasMore: rows.length > SIDEBAR_ITEMS_LIMIT,
  };
}
