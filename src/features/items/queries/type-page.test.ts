import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, findMany, findTags } = vi.hoisted(() => ({
  count: vi.fn(),
  findMany: vi.fn(),
  findTags: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { item: { count, findMany }, tag: { findMany: findTags } },
}));

import {
  countItemsOfType,
  getItemsOfType,
  getTypeTagNames,
} from "@/features/items/queries/type-page";

describe("countItemsOfType and getItemsOfType", () => {
  beforeEach(() => {
    count.mockReset().mockResolvedValue(50);
    findMany.mockReset().mockResolvedValue([]);
  });

  it("count and read the same rows, the caller's items of the type", async () => {
    await countItemsOfType("user-1", "type-1", null);
    await getItemsOfType(
      "user-1",
      "type-1",
      { sort: "newest", tag: null },
      0,
      21,
    );

    const where = { userId: "user-1", typeId: "type-1" };
    expect(count.mock.calls[0][0].where).toEqual(where);
    expect(findMany.mock.calls[0][0].where).toEqual(where);
  });

  it("narrow both to the items with the caller's tag of that name", async () => {
    await countItemsOfType("user-1", "type-1", "react");
    await getItemsOfType(
      "user-1",
      "type-1",
      { sort: "newest", tag: "react" },
      0,
      21,
    );

    const where = {
      userId: "user-1",
      typeId: "type-1",
      tags: { some: { tag: { userId: "user-1", name: "react" } } },
    };
    expect(count.mock.calls[0][0].where).toEqual(where);
    expect(findMany.mock.calls[0][0].where).toEqual(where);
  });

  it.each([
    ["newest", [{ createdAt: "desc" }, { id: "desc" }]],
    ["oldest", [{ createdAt: "asc" }, { id: "asc" }]],
    ["a-z", [{ title: "asc" }, { id: "asc" }]],
    ["z-a", [{ title: "desc" }, { id: "desc" }]],
  ] as const)(
    "sort %s: pins first, then the sort, with no ties",
    async (sort, order) => {
      await getItemsOfType("user-1", "type-1", { sort, tag: null }, 21, 21);

      const { skip, take, orderBy } = findMany.mock.calls[0][0];
      expect({ skip, take }).toEqual({ skip: 21, take: 21 });
      expect(orderBy).toEqual([{ isPinned: "desc" }, ...order]);
    },
  );
});

describe("getTypeTagNames", () => {
  it("reads the caller's tags on their items of the type, by letter", async () => {
    findTags
      .mockReset()
      .mockResolvedValue([{ name: "React" }, { name: "zod" }, { name: "api" }]);

    await expect(getTypeTagNames("user-1", "type-1")).resolves.toEqual([
      "api",
      "React",
      "zod",
    ]);
    expect(findTags.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      items: { some: { item: { userId: "user-1", typeId: "type-1" } } },
    });
  });
});
