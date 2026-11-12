import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, rankUserItemIds } = vi.hoisted(() => ({
  findMany: vi.fn(),
  rankUserItemIds: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { item: { findMany } } }));
vi.mock("@/features/items/_internal/queries/search-ranking", () => ({
  rankUserItemIds,
}));

import { SEARCH_PAGE_SIZE } from "@/features/items/domain/search-text";
import {
  getRecentSearchableItems,
  searchUserItems,
} from "@/features/items/queries/search";

const createdAt = new Date("2026-01-15T00:00:00Z");

const card = {
  id: "item-1",
  title: "dev",
  description: null,
  isFavorite: false,
  isPinned: false,
  createdAt,
  type: { id: "type-1", name: "command", icon: "Terminal", color: null },
  tags: [{ tag: { name: "cli" } }],
  contentType: "TEXT",
  content: null,
  url: null,
};

const ids = (count: number) =>
  Array.from({ length: count }, (_, i) => `item-${i}`);

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([]);
  rankUserItemIds.mockReset().mockResolvedValue([]);
});

describe("getRecentSearchableItems", () => {
  it("reads only the caller's last edited items", async () => {
    await getRecentSearchableItems("user-1");

    const { where, orderBy, take } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1" });
    expect(orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
    expect(take).toBe(8);
  });

  it("previews a text item's content and a link's URL, and nothing for a file", async () => {
    findMany.mockResolvedValue([
      { ...card, content: "npm run\ndev" },
      { ...card, id: "item-2", contentType: "URL", url: "https://react.dev" },
      { ...card, id: "item-3", contentType: "FILE" },
    ]);

    const items = await getRecentSearchableItems("user-1");

    expect(items.map((item) => item.preview)).toEqual([
      "npm run dev",
      "https://react.dev",
      null,
    ]);
  });

  // The route sends this as it is, so a leftover field would put the item's
  // full text in the browser.
  it("never hands over the content, only the preview", async () => {
    findMany.mockResolvedValue([{ ...card, content: "a".repeat(5000) }]);

    const [item] = await getRecentSearchableItems("user-1");

    expect(item).not.toHaveProperty("content");
    expect(item).not.toHaveProperty("url");
    expect(item).not.toHaveProperty("contentType");
    expect(item.preview).toHaveLength(120);
  });

  // The drawer opens straight from these items, so they keep its fields.
  it("keeps the fields the drawer reads", async () => {
    findMany.mockResolvedValue([card]);

    const [item] = await getRecentSearchableItems("user-1");

    expect(item).toMatchObject({
      id: "item-1",
      title: "dev",
      tags: ["cli"],
      type: { id: "type-1", name: "command", icon: "Terminal" },
      createdAt,
    });
  });
});

describe("searchUserItems", () => {
  it("answers a text with nothing to match without a query", async () => {
    await expect(searchUserItems("user-1", "!!", 0)).resolves.toEqual({
      items: [],
      nextOffset: null,
    });
    expect(rankUserItemIds).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("asks for one row more than a page, from the offset", async () => {
    await searchUserItems("user-1", "react hook", 40);

    expect(rankUserItemIds).toHaveBeenCalledWith(
      "user-1",
      { tsQuery: "react:* & hook:*", typoText: "react hook" },
      { offset: 40, limit: SEARCH_PAGE_SIZE + 1 },
    );
  });

  it("keeps the rank order and reads the rows by the owner", async () => {
    rankUserItemIds.mockResolvedValue(["b", "a"]);
    findMany.mockResolvedValue([
      { ...card, id: "a" },
      { ...card, id: "b" },
    ]);

    const page = await searchUserItems("user-1", "dev", 0);

    expect(page.items.map((item) => item.id)).toEqual(["b", "a"]);
    expect(page.nextOffset).toBeNull();
    expect(findMany.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      id: { in: ["b", "a"] },
    });
  });

  it("leaves out an item deleted between the ranking and the read", async () => {
    rankUserItemIds.mockResolvedValue(["a", "gone"]);
    findMany.mockResolvedValue([{ ...card, id: "a" }]);

    const page = await searchUserItems("user-1", "dev", 0);

    expect(page.items.map((item) => item.id)).toEqual(["a"]);
  });

  it("offers the next page only when the ranking found more", async () => {
    rankUserItemIds.mockResolvedValue(ids(SEARCH_PAGE_SIZE + 1));

    const page = await searchUserItems("user-1", "dev", 20);

    expect(findMany.mock.calls[0][0].where.id.in).toHaveLength(
      SEARCH_PAGE_SIZE,
    );
    expect(page.nextOffset).toBe(20 + SEARCH_PAGE_SIZE);
  });
});
