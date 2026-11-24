import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({ prisma: { item: { findFirst } } }));

import {
  getItemDetail,
  getItemDetailOfType,
  getItemFileKey,
} from "@/features/items/_internal/queries/item-detail";

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

    await getItemDetailOfType("user-1", "item-1", "snippets");

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1", userId: "user-1", type: { slug: "snippets" } },
      }),
    );
  });

  it("returns null when the item is missing, someone else's or of another type", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      getItemDetailOfType("user-1", "item-1", "notes"),
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

describe("getItemFileKey", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("only looks up items that belong to the caller", async () => {
    findFirst.mockResolvedValue(null);

    await getItemFileKey("user-1", "item-1");

    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "item-1",
      userId: "user-1",
    });
  });

  it("tells a missing item from an item with no file", async () => {
    findFirst.mockResolvedValueOnce(null);
    await expect(getItemFileKey("user-1", "item-1")).resolves.toBeNull();

    findFirst.mockResolvedValueOnce({ fileKey: null });
    await expect(getItemFileKey("user-1", "item-1")).resolves.toEqual({
      fileKey: null,
    });
  });
});
