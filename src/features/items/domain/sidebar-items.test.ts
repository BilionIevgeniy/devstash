import { describe, expect, it } from "vitest";

import {
  limitSidebarRows,
  SIDEBAR_ITEMS_LIMIT,
} from "@/features/items/domain/sidebar-items";

function rows(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

describe("limitSidebarRows", () => {
  it("has nothing more to show with no rows", () => {
    expect(limitSidebarRows([])).toEqual({ rows: [], hasMore: false });
  });

  it("shows every row when they fit the limit exactly", () => {
    const limited = limitSidebarRows(rows(SIDEBAR_ITEMS_LIMIT));

    expect(limited.rows).toHaveLength(SIDEBAR_ITEMS_LIMIT);
    expect(limited.hasMore).toBe(false);
  });

  it("drops the row past the limit and reports that there are more", () => {
    const limited = limitSidebarRows(rows(SIDEBAR_ITEMS_LIMIT + 1));

    expect(limited.rows).toEqual(rows(SIDEBAR_ITEMS_LIMIT));
    expect(limited.hasMore).toBe(true);
  });
});
