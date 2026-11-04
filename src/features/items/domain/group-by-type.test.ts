import { describe, expect, it } from "vitest";
import { groupItemsByType } from "@/features/items/domain/group-by-type";

const NOTE = { id: "t-note", name: "note", icon: "StickyNote" };
const IMAGE = { id: "t-image", name: "image", icon: "Image" };

describe("groupItemsByType", () => {
  it("puts the type with the most items first", () => {
    const groups = groupItemsByType([
      { id: "a", type: NOTE },
      { id: "b", type: IMAGE },
      { id: "c", type: IMAGE },
    ]);

    expect(groups.map(({ type }) => type.name)).toEqual(["image", "note"]);
  });

  it("keeps the order of the items inside a group", () => {
    const [group] = groupItemsByType([
      { id: "newest", type: NOTE },
      { id: "oldest", type: NOTE },
    ]);

    expect(group.items.map(({ id }) => id)).toEqual(["newest", "oldest"]);
  });

  it("returns no groups for no items", () => {
    expect(groupItemsByType([])).toEqual([]);
  });
});
