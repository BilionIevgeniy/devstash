import { describe, expect, it } from "vitest";

import {
  decodeListCursor,
  encodeListCursor,
} from "@/features/items/domain/list-cursor";
import {
  FAVORITE_CURSOR_KINDS,
  favoriteCursorValues,
  splitPage,
} from "@/features/items/domain/list-pages";
import type { FavoriteItem } from "@/features/items/types";

const DATE_KINDS = FAVORITE_CURSOR_KINDS.newest;

describe("list cursor", () => {
  it("gives back the values it was made of, for the sort it was made for", () => {
    const values = ["2026-03-01T10:00:00.000Z", "item-1"];
    const cursor = encodeListCursor("newest", values);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeListCursor(cursor, "newest", DATE_KINDS)).toEqual(values);
  });

  it("keeps a title in any script", () => {
    const values = ["Ünïcode 🚀 заметка", "item-1"];
    const cursor = encodeListCursor("a-z", values);

    expect(
      decodeListCursor(cursor, "a-z", FAVORITE_CURSOR_KINDS["a-z"]),
    ).toEqual(values);
  });

  it("refuses a cursor made for another sort", () => {
    const cursor = encodeListCursor("a-z", [
      "2026-03-01T10:00:00.000Z",
      "item-1",
    ]);

    expect(decodeListCursor(cursor, "newest", DATE_KINDS)).toBeNull();
  });

  it("refuses a title where a date belongs, and a wrong length", () => {
    expect(
      decodeListCursor(
        encodeListCursor("newest", ["apple", "item-1"]),
        "newest",
        DATE_KINDS,
      ),
    ).toBeNull();
    expect(
      decodeListCursor(
        encodeListCursor("newest", ["2026-03-01T10:00:00.000Z"]),
        "newest",
        DATE_KINDS,
      ),
    ).toBeNull();
    expect(
      decodeListCursor(
        encodeListCursor("newest", ["2026-02-30T10:00:00.000Z", ""]),
        "newest",
        DATE_KINDS,
      ),
    ).toBeNull();
  });

  it.each([
    ["not base64url", "a+b/c="],
    ["not JSON", btoa("{nope").replace(/=+$/, "")],
    ["no body", btoa("[1,2]").replace(/=+$/, "")],
    ["empty", ""],
  ])("refuses %s", (_name, text) => {
    expect(decodeListCursor(text, "newest", DATE_KINDS)).toBeNull();
  });
});

describe("list pages", () => {
  const row: FavoriteItem = {
    id: "item-1",
    title: "Debounce",
    description: null,
    isFavorite: true,
    isPinned: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    favoritedAt: new Date("2026-03-01T10:00:00.000Z"),
    tags: [],
    type: { id: "type-1", name: "snippet", icon: "Code" },
  };

  it("puts the sort keys of a row and then its id in its cursor", () => {
    expect(favoriteCursorValues(row, "newest")).toEqual([
      "2026-03-01T10:00:00.000Z",
      "item-1",
    ]);
    expect(favoriteCursorValues(row, "type")).toEqual([
      "snippet",
      "type-1",
      "Debounce",
      "item-1",
    ]);
  });

  it("leaves the extra row out and says there is more", () => {
    expect(splitPage([1, 2, 3], 2)).toEqual({ rows: [1, 2], hasMore: true });
    expect(splitPage([1, 2], 2)).toEqual({ rows: [1, 2], hasMore: false });
  });
});
