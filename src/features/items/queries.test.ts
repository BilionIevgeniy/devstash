import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, findFirst, findMany, findTags } = vi.hoisted(() => ({
  count: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findTags: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { item: { count, findFirst, findMany }, tag: { findMany: findTags } },
}));

import {
  getAllPinnedItems,
  getFavoriteItems,
  countItemsOfType,
  getItemEditState,
  getItemsOfType,
  getPinnedItems,
  getRecentItems,
  getSearchableItems,
  getSidebarItems,
  getTypeTagNames,
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

describe("getPinnedItems", () => {
  it("reads only the caller's pins, newest first with no ties, up to the limit", async () => {
    findMany.mockReset().mockResolvedValue([]);

    await getPinnedItems("user-1");

    const { where, orderBy, take } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1", isPinned: true });
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(take).toBe(50);
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

describe("getAllPinnedItems", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads every pin of the caller, newest first with no ties", async () => {
    await getAllPinnedItems("user-1");

    const { where, orderBy, take } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1", isPinned: true });
    expect(orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(take).toBeUndefined();
  });

  it("does not read the content or the object key", async () => {
    await getAllPinnedItems("user-1");

    const { select } = findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty("content");
    expect(select).not.toHaveProperty("fileKey");
  });
});

describe("getSidebarItems", () => {
  const type = { id: "type-1", name: "note", icon: "StickyNote", color: null };
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      title: "note",
      type,
    }));

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads one row past the limit of the caller's two groups", async () => {
    await getSidebarItems("user-1");

    const [favorites, pinned] = findMany.mock.calls.map(([args]) => args);
    expect(favorites.where).toEqual({ userId: "user-1", isFavorite: true });
    expect(pinned.where).toEqual({ userId: "user-1", isPinned: true });
    expect(favorites.take).toBe(6);
    expect(pinned.take).toBe(6);
  });

  it("reports more pins and shows only the limit", async () => {
    findMany.mockResolvedValueOnce(rows(5)).mockResolvedValueOnce(rows(6));

    const result = await getSidebarItems("user-1");

    expect(result.favorites).toHaveLength(5);
    expect(result.hasMoreFavorites).toBe(false);
    expect(result.pinned).toHaveLength(5);
    expect(result.hasMorePinned).toBe(true);
  });
});

describe("getFavoriteItems", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads only the caller's favorites, last starred first with no ties", async () => {
    await getFavoriteItems("user-1");

    const { where, orderBy, take } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1", isFavorite: true });
    expect(orderBy).toEqual([
      { favoritedAt: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ]);
    expect(take).toBeUndefined();
  });

  it("falls back to the last change for a favorite with no star date", async () => {
    const updatedAt = new Date("2026-02-01T00:00:00Z");
    findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "dev",
        description: null,
        isFavorite: true,
        isPinned: false,
        createdAt,
        favoritedAt: null,
        updatedAt,
        type: { id: "type-1", name: "command", icon: "Terminal", color: null },
        tags: [],
      },
    ]);

    const [item] = await getFavoriteItems("user-1");

    expect(item.favoritedAt).toBe(updatedAt);
  });

  it("keeps the date the row shows and selects no content or object key", async () => {
    const favoritedAt = new Date("2026-02-01T00:00:00Z");
    findMany.mockResolvedValue([
      {
        id: "item-1",
        title: "dev",
        description: null,
        isFavorite: true,
        isPinned: false,
        createdAt,
        favoritedAt,
        updatedAt: createdAt,
        type: { id: "type-1", name: "command", icon: "Terminal", color: null },
        tags: [{ tag: { name: "npm" } }],
      },
    ]);

    const [item] = await getFavoriteItems("user-1");

    expect(item.favoritedAt).toBe(favoritedAt);
    expect(item).not.toHaveProperty("updatedAt");
    expect(item.tags).toEqual(["npm"]);
    const { select } = findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty("content");
    expect(select).not.toHaveProperty("fileKey");
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
