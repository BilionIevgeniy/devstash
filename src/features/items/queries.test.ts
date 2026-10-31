import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findMany } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { item: { findFirst, findMany } } }));

import {
  getItemDetail,
  getItemDetailOfType,
  getRecentItems,
} from "@/features/items/queries";

const createdAt = new Date("2026-01-15T00:00:00Z");
const updatedAt = new Date("2026-02-01T00:00:00Z");

const rawItem = {
  id: "item-1",
  title: "useAuth Hook",
  description: "Custom authentication hook",
  isFavorite: true,
  isPinned: false,
  createdAt,
  updatedAt,
  contentType: "text",
  content: "export function useAuth() {}",
  url: null,
  fileUrl: null,
  fileName: null,
  fileSize: null,
  language: "typescript",
  type: { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" },
  tags: [{ tag: { name: "auth" } }, { tag: { name: "react" } }],
  collections: [{ collection: { id: "col-1", name: "React Patterns" } }],
};

describe("getItemDetail", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("only looks up items that belong to the caller", async () => {
    findFirst.mockResolvedValue(null);

    await getItemDetail("user-1", "item-1");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-1", userId: "user-1" } }),
    );
  });

  it("returns null when the item is missing or someone else's", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getItemDetail("user-1", "item-1")).resolves.toBeNull();
  });

  it("flattens tags and collections into the detail DTO", async () => {
    findFirst.mockResolvedValue(rawItem);

    const detail = await getItemDetail("user-1", "item-1");

    expect(detail).toMatchObject({
      id: "item-1",
      language: "typescript",
      content: "export function useAuth() {}",
      tags: ["auth", "react"],
      collections: [{ id: "col-1", name: "React Patterns" }],
      type: { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" },
      createdAt,
      updatedAt,
    });
  });
});

describe("getItemDetailOfType", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("only looks up the caller's item of the type in the URL", async () => {
    findFirst.mockResolvedValue(null);

    await getItemDetailOfType("user-1", "item-1", "snippet");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1", userId: "user-1", type: { name: "snippet" } },
      }),
    );
  });

  it("returns null when the item is missing, someone else's or of another type", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      getItemDetailOfType("user-1", "item-1", "note"),
    ).resolves.toBeNull();
  });

  it("returns the same detail DTO as getItemDetail", async () => {
    findFirst.mockResolvedValue(rawItem);

    const detail = await getItemDetailOfType("user-1", "item-1", "snippet");

    expect(detail).toMatchObject({
      id: "item-1",
      tags: ["auth", "react"],
      collections: [{ id: "col-1", name: "React Patterns" }],
      type: { id: "type-1", name: "snippet", icon: "Code", color: "#3b82f6" },
      createdAt,
      updatedAt,
    });
  });
});

describe("getRecentItems", () => {
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
