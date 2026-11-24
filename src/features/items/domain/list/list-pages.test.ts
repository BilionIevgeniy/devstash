import { describe, expect, it } from "vitest";

import { FAVORITE_ITEM_SORTS } from "@/features/items/domain/list/favorite-sort";
import {
  FAVORITE_CURSOR_KINDS,
  favoriteCursorValues,
  PINNED_CURSOR_KINDS,
  pinnedCursorValues,
  splitPage,
} from "@/features/items/domain/list/list-pages";
import { PINNED_ITEM_SORTS } from "@/features/items/domain/list/pinned-items";
import type { FavoriteItem } from "@/features/items/types";

const ROW: FavoriteItem = {
  id: "item-1",
  title: "useDebounce",
  description: null,
  isFavorite: true,
  isPinned: true,
  createdAt: new Date("2026-01-02T03:04:05.678Z"),
  favoritedAt: new Date("2026-02-03T04:05:06.789Z"),
  tags: [],
  aiTags: [],
  descriptionAiGenerated: false,
  type: { id: "type-1", name: "snippet", slug: "snippets", icon: "Code" },
};

describe("the cursor of a list", () => {
  // The order must be total, or a page boundary splits rows of equal value.
  it.each(FAVORITE_ITEM_SORTS)(
    "of favorites by %s has one value per kind and ends with the id",
    (sort) => {
      const values = favoriteCursorValues(ROW, sort);

      expect(values).toHaveLength(FAVORITE_CURSOR_KINDS[sort].length);
      expect(values.at(-1)).toBe("item-1");
    },
  );

  it.each(PINNED_ITEM_SORTS)(
    "of pins by %s has one value per kind and ends with the id",
    (sort) => {
      const values = pinnedCursorValues(ROW, sort);

      expect(values).toHaveLength(PINNED_CURSOR_KINDS[sort].length);
      expect(values.at(-1)).toBe("item-1");
    },
  );

  it("dates a favorite by its star and a pin by its creation, to the millisecond", () => {
    expect(favoriteCursorValues(ROW, "newest")[0]).toBe(
      "2026-02-03T04:05:06.789Z",
    );
    expect(pinnedCursorValues(ROW, "oldest")[0]).toBe(
      "2026-01-02T03:04:05.678Z",
    );
  });

  it("tells two types of the same name apart by their id", () => {
    expect(favoriteCursorValues(ROW, "type")).toEqual([
      "snippet",
      "type-1",
      "useDebounce",
      "item-1",
    ]);
  });
});

describe("splitPage", () => {
  it("leaves out the extra row that says there is a next page", () => {
    expect(splitPage([1, 2, 3], 2)).toEqual({ rows: [1, 2], hasMore: true });
  });

  it("has no next page after exactly one page, or less", () => {
    expect(splitPage([1, 2], 2)).toEqual({ rows: [1, 2], hasMore: false });
    expect(splitPage([], 2)).toEqual({ rows: [], hasMore: false });
  });
});
