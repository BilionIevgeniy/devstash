import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({ prisma: { item: { findMany } } }));

import {
  getPinnedItems,
  getRecentItems,
} from "@/features/items/queries/dashboard";

const createdAt = new Date("2026-01-15T00:00:00Z");

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
