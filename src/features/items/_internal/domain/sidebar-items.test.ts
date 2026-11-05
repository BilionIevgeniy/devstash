import { describe, expect, it } from "vitest";

import {
  limitSidebarFavorites,
  SIDEBAR_ITEMS_LIMIT,
} from "@/features/items/_internal/domain/sidebar-items";

function rows(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

describe("limitSidebarFavorites", () => {
  it("has nothing more to show with no favorites", () => {
    expect(limitSidebarFavorites([])).toEqual({
      favorites: [],
      hasMoreFavorites: false,
    });
  });

  it("shows every favorite when they fit the limit exactly", () => {
    const { favorites, hasMoreFavorites } = limitSidebarFavorites(
      rows(SIDEBAR_ITEMS_LIMIT),
    );

    expect(favorites).toHaveLength(SIDEBAR_ITEMS_LIMIT);
    expect(hasMoreFavorites).toBe(false);
  });

  it("drops the row past the limit and reports that there are more", () => {
    const { favorites, hasMoreFavorites } = limitSidebarFavorites(
      rows(SIDEBAR_ITEMS_LIMIT + 1),
    );

    expect(favorites).toEqual(rows(SIDEBAR_ITEMS_LIMIT));
    expect(hasMoreFavorites).toBe(true);
  });
});
