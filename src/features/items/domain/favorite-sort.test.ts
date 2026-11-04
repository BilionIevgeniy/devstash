import { describe, expect, it } from "vitest";

import { sortFavoriteItems } from "@/features/items/domain/favorite-sort";
import type { FavoriteItem } from "@/features/items/types";

function favorite(
  title: string,
  typeName: string,
  favoritedAt: string,
): FavoriteItem {
  return {
    id: title,
    title,
    description: null,
    isFavorite: true,
    isPinned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    favoritedAt: new Date(favoritedAt),
    tags: [],
    type: { id: typeName, name: typeName, icon: "Code", color: "#000" },
  };
}

const items = [
  favorite("beta", "snippet", "2026-02-01T00:00:00Z"),
  favorite("Alpha", "snippet", "2026-01-01T00:00:00Z"),
  favorite("gamma", "command", "2026-03-01T00:00:00Z"),
];

function titles(sorted: FavoriteItem[]): string[] {
  return sorted.map((item) => item.title);
}

describe("sortFavoriteItems", () => {
  it("puts the newest star first by date", () => {
    expect(titles(sortFavoriteItems(items, "date"))).toEqual([
      "gamma",
      "beta",
      "Alpha",
    ]);
  });

  it("keeps the server's order for favorites starred at the same moment", () => {
    const sameMoment = [
      favorite("second", "snippet", "2026-02-01T00:00:00Z"),
      favorite("first", "snippet", "2026-02-01T00:00:00Z"),
    ];

    expect(titles(sortFavoriteItems(sameMoment, "date"))).toEqual([
      "second",
      "first",
    ]);
  });

  it("sorts names A-Z without regard to case", () => {
    expect(titles(sortFavoriteItems(items, "name"))).toEqual([
      "Alpha",
      "beta",
      "gamma",
    ]);
  });

  it("groups by type name, then by title inside a type", () => {
    expect(titles(sortFavoriteItems(items, "type"))).toEqual([
      "gamma",
      "Alpha",
      "beta",
    ]);
  });

  it("keeps the order of the type groups when a group holds the most items", () => {
    const more = [
      ...items,
      favorite("delta", "snippet", "2026-04-01T00:00:00Z"),
    ];

    expect(sortFavoriteItems(more, "type")[0].type.name).toBe("command");
  });

  it("leaves the array it was given untouched", () => {
    const before = titles(items);

    sortFavoriteItems(items, "name");

    expect(titles(items)).toEqual(before);
  });
});
