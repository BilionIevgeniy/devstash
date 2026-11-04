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
  it("puts the newest star first by date", () => {
    expect(names(sortFavoriteCollections(collections, "date"))).toEqual([
      "Python",
      "go",
      "react",
    ]);
  });

  it("sorts names A-Z without regard to case", () => {
    expect(names(sortFavoriteCollections(collections, "name"))).toEqual([
      "go",
      "Python",
      "react",
    ]);
  });

  it("falls back to the name in the type sort, having no type", () => {
    expect(names(sortFavoriteCollections(collections, "type"))).toEqual([
      "go",
      "Python",
      "react",
    ]);
  });
});
