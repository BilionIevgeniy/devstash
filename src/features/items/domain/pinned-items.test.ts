import { describe, expect, it } from "vitest";

import {
  groupPinnedItems,
  sortPinnedItems,
} from "@/features/items/domain/pinned-items";
import type { DashboardItem } from "@/features/items/types";

function item(
  id: string,
  title: string,
  createdAt: string,
  typeName = "snippet",
): DashboardItem {
  return {
    id,
    title,
    description: null,
    isFavorite: false,
    isPinned: true,
    createdAt: new Date(createdAt),
    tags: [],
    type: { id: typeName, name: typeName, icon: "Code", color: "#000000" },
  };
}

const ids = (items: DashboardItem[]) => items.map(({ id }) => id);

describe("sortPinnedItems", () => {
  const items = [
    item("old", "banana", "2026-01-01"),
    item("new", "apple", "2026-03-01"),
    item("mid", "Cherry", "2026-02-01"),
  ];

  it("sorts by the creation date, both ways", () => {
    expect(ids(sortPinnedItems(items, "newest"))).toEqual([
      "new",
      "mid",
      "old",
    ]);
    expect(ids(sortPinnedItems(items, "oldest"))).toEqual([
      "old",
      "mid",
      "new",
    ]);
  });

  it("sorts by title, both ways, ignoring case", () => {
    expect(ids(sortPinnedItems(items, "a-z"))).toEqual(["new", "old", "mid"]);
    expect(ids(sortPinnedItems(items, "z-a"))).toEqual(["mid", "old", "new"]);
  });

  it("keeps the server's order for equal dates", () => {
    const tied = [
      item("first", "a", "2026-01-01"),
      item("second", "b", "2026-01-01"),
    ];

    expect(ids(sortPinnedItems(tied, "newest"))).toEqual(["first", "second"]);
  });
});

describe("groupPinnedItems", () => {
  it("makes one group per type, keeping the order inside a group", () => {
    const groups = groupPinnedItems([
      item("s1", "a", "2026-01-01", "snippet"),
      item("c1", "b", "2026-01-01", "command"),
      item("s2", "c", "2026-01-01", "snippet"),
    ]);

    expect(groups.map(({ items }) => ids(items))).toEqual([
      ["c1"],
      ["s1", "s2"],
    ]);
  });

  it("orders groups by type name, whatever they hold", () => {
    const few = [item("n1", "a", "2026-01-01", "note")];
    const many = [
      item("s1", "b", "2026-01-01", "snippet"),
      item("s2", "c", "2026-01-01", "snippet"),
    ];
    const names = (items: DashboardItem[]) =>
      groupPinnedItems(items).map(({ type }) => type.name);

    expect(names([...few, ...many])).toEqual(["note", "snippet"]);
    expect(names([...many, ...few, ...few])).toEqual(["note", "snippet"]);
  });

  it("has no groups with no items", () => {
    expect(groupPinnedItems([])).toEqual([]);
  });
});
