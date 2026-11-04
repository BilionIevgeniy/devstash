import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, findFirst, findMany } = vi.hoisted(() => ({
  count: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { item: { count, findFirst, findMany } },
}));

import {
  getItemEditState,
  getItemsByType,
  getRecentItems,
  getSearchableItems,
} from "@/features/items/queries";

const createdAt = new Date("2026-01-15T00:00:00Z");

describe("getItemEditState", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("only looks up items that belong to the caller", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getItemEditState("user-1", "item-1")).resolves.toBeNull();

    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "item-1",
      userId: "user-1",
    });
  });

  it("flattens the type and the collection links", async () => {
    findFirst.mockResolvedValue({
      type: { name: "snippet" },
      collections: [{ collectionId: "col-1" }, { collectionId: "col-2" }],
    });

    await expect(getItemEditState("user-1", "item-1")).resolves.toEqual({
      typeName: "snippet",
      collectionIds: ["col-1", "col-2"],
    });
  });
});

describe("getItemsByType", () => {
  beforeEach(() => {
    count.mockReset().mockResolvedValue(50);
    findMany.mockReset().mockResolvedValue([]);
  });

  it("counts and reads the same rows, the caller's items of the type", async () => {
    await getItemsByType("user-1", "type-1", 1);

    const where = { userId: "user-1", typeId: "type-1" };
    expect(count.mock.calls[0][0].where).toEqual(where);
    expect(findMany.mock.calls[0][0].where).toEqual(where);
  });

  it("reads only the rows of the page, in an order with no ties", async () => {
    const result = await getItemsByType("user-1", "type-1", 2);

    const { skip, take, orderBy } = findMany.mock.calls[0][0];
    expect({ skip, take }).toEqual({ skip: 21, take: 21 });
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(result).toMatchObject({ totalCount: 50, page: 2, totalPages: 3 });
  });
});

describe("getRecentItems", () => {
  it("reads only what the dashboard shows", async () => {
    findMany.mockReset().mockResolvedValue([]);

    await getRecentItems("user-1");

    expect(findMany.mock.calls[0][0].take).toBe(10);
  });

  const card = {
    id: "item-1",
    title: "dev",
    description: null,
    isFavorite: false,
    isPinned: false,
    createdAt,
    type: { id: "type-1", name: "command", icon: "Terminal", color: null },
    tags: [],
  };

  it("tells whether there is something to copy without sending the content", async () => {
    findMany.mockResolvedValue([
      { ...card, contentType: "TEXT", content: "npm run dev", url: null },
      { ...card, id: "item-2", contentType: "TEXT", content: null, url: null },
      { ...card, id: "item-3", contentType: "FILE", content: null, url: null },
    ]);

    const items = await getRecentItems("user-1");

    expect(items.map((item) => item.canCopy)).toEqual([true, false, false]);
    for (const item of items) {
      expect(item).not.toHaveProperty("content");
      expect(item).not.toHaveProperty("url");
    }
  });
});

describe("getSearchableItems", () => {
  const card = {
    id: "item-1",
    title: "dev",
    description: null,
    isFavorite: false,
    isPinned: false,
    createdAt,
    type: { id: "type-1", name: "command", icon: "Terminal", color: null },
    tags: [{ tag: { name: "cli" } }],
    content: null,
    url: null,
  };

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads only the caller's items, last edited first, up to the limit", async () => {
    await getSearchableItems("user-1");

    const { where, orderBy, take } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1" });
    expect(orderBy).toEqual({ updatedAt: "desc" });
    expect(take).toBe(1000);
  });

  it("previews a text item's content and a link's URL, and nothing for a file", async () => {
    findMany.mockResolvedValue([
      { ...card, contentType: "TEXT", content: "npm run\ndev" },
      { ...card, id: "item-2", contentType: "URL", url: "https://react.dev" },
      { ...card, id: "item-3", contentType: "FILE" },
    ]);

    const items = await getSearchableItems("user-1");

    expect(items.map((item) => item.preview)).toEqual([
      "npm run dev",
      "https://react.dev",
      null,
    ]);
  });

  // The route sends this as it is, so a leftover field would put every item's
  // full text in the browser.
  it("never hands over the content, only the preview", async () => {
    findMany.mockResolvedValue([
      { ...card, contentType: "TEXT", content: "a".repeat(5000) },
      { ...card, id: "item-2", contentType: "URL", url: "https://react.dev" },
    ]);

    const items = await getSearchableItems("user-1");

    for (const item of items) {
      expect(item).not.toHaveProperty("content");
      expect(item).not.toHaveProperty("url");
      expect(item).not.toHaveProperty("contentType");
    }
    expect(items[0].preview).toHaveLength(120);
  });

  // The drawer opens straight from these items, so they keep its fields.
  it("keeps the fields the drawer reads", async () => {
    findMany.mockResolvedValue([{ ...card, contentType: "TEXT" }]);

    const [item] = await getSearchableItems("user-1");

    expect(item).toMatchObject({
      id: "item-1",
      title: "dev",
      tags: ["cli"],
      type: { id: "type-1", name: "command", icon: "Terminal" },
      createdAt,
    });
  });
});
