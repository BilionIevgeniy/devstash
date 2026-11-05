import { describe, expect, it } from "vitest";

import { sortFavoriteCollections } from "@/features/collections/domain/favorite-sort";
import type { FavoriteCollection } from "@/features/collections/types";

function favorite(name: string, favoritedAt: string): FavoriteCollection {
  return { id: name, name, favoritedAt: new Date(favoritedAt) };
}

const collections = [
  favorite("react", "2026-01-01T00:00:00Z"),
  favorite("Python", "2026-03-01T00:00:00Z"),
  favorite("go", "2026-02-01T00:00:00Z"),
];

function names(sorted: FavoriteCollection[]): string[] {
  return sorted.map((collection) => collection.name);
}

describe("sortFavoriteCollections", () => {
  it("puts the newest star first", () => {
    expect(names(sortFavoriteCollections(collections, "newest"))).toEqual([
      "Python",
      "go",
      "react",
    ]);
  });

  it("puts the oldest star first", () => {
    expect(names(sortFavoriteCollections(collections, "oldest"))).toEqual([
      "react",
      "go",
      "Python",
    ]);
  });

  it("keeps the server's order for favorites starred at the same moment", () => {
    const sameMoment = [
      favorite("second", "2026-02-01T00:00:00Z"),
      favorite("first", "2026-02-01T00:00:00Z"),
    ];

    expect(names(sortFavoriteCollections(sameMoment, "oldest"))).toEqual([
      "second",
      "first",
    ]);
  });

  it("sorts names A-Z without regard to case", () => {
    expect(names(sortFavoriteCollections(collections, "a-z"))).toEqual([
      "go",
      "Python",
      "react",
    ]);
  });

  it("sorts names Z-A without regard to case", () => {
    expect(names(sortFavoriteCollections(collections, "z-a"))).toEqual([
      "react",
      "Python",
      "go",
    ]);
  });

  it("keeps the server's order for names that differ only by case in Z-A", () => {
    const sameName = [
      favorite("alpha", "2026-02-01T00:00:00Z"),
      favorite("Alpha", "2026-01-01T00:00:00Z"),
    ];

    expect(names(sortFavoriteCollections(sameName, "z-a"))).toEqual([
      "alpha",
      "Alpha",
    ]);
  });
});
