import { describe, expect, it } from "vitest";

import {
  visibleListItems,
  pendingRemovals,
} from "@/features/items/domain/list/list-rows";

const ITEMS = [{ id: "a" }, { id: "b" }];
const NOTHING_HIDDEN: ReadonlySet<string> = new Set();
const NO_OVERRIDES: ReadonlyMap<string, boolean> = new Map();

describe("visibleListItems", () => {
  it("keeps a row with no override", () => {
    expect(visibleListItems(ITEMS, NOTHING_HIDDEN, NO_OVERRIDES)).toEqual(
      ITEMS,
    );
  });

  it("leaves out a row being deleted", () => {
    expect(visibleListItems(ITEMS, new Set(["a"]), NO_OVERRIDES)).toEqual([
      { id: "b" },
    ]);
  });

  it("leaves out a row whose removal was asked for", () => {
    expect(
      visibleListItems(ITEMS, NOTHING_HIDDEN, new Map([["b", false]])),
    ).toEqual([{ id: "a" }]);
  });

  it("keeps a row being set again", () => {
    expect(
      visibleListItems(ITEMS, NOTHING_HIDDEN, new Map([["a", true]])),
    ).toEqual(ITEMS);
  });
});

describe("pendingRemovals", () => {
  const LOADED = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("counts an unstarred row and a deleted one, each once", () => {
    const overrides = new Map([
      ["a", false],
      ["b", true],
    ]);
    expect(pendingRemovals(LOADED, new Set(), overrides)).toBe(1);
    expect(pendingRemovals(LOADED, new Set(["a", "c"]), overrides)).toBe(2);
    expect(pendingRemovals(LOADED, new Set(["elsewhere"]), new Map())).toBe(0);
  });
});
