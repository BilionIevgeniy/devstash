import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, findFirst, findMany, groupBy } = vi.hoisted(() => ({
  count: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { item: { count, findFirst, findMany, groupBy } },
}));

import {
  getCollectionItemRecords,
  getCollectionTypeCounts,
  getItemDetail,
  getItemDetailOfType,
  getItemFileKey,
  getUploadItemsByType,
} from "@/features/items/_internal/queries";

const createdAt = new Date("2026-01-15T00:00:00Z");
const updatedAt = new Date("2026-02-01T00:00:00Z");

const PINNED_FIRST_ORDER = [
  { isPinned: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
];

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

describe("getCollectionItemRecords", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads only the caller's items linked to the collection", async () => {
    await getCollectionItemRecords("user-1", "col-1", 0, 21);

    expect(findMany.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      collections: { some: { collectionId: "col-1" } },
    });
  });

  it("reads only the rows it is asked for, pinned first", async () => {
    await getCollectionItemRecords("user-1", "col-1", 21, 21);

    const { skip, take, orderBy } = findMany.mock.calls[0][0];
    expect({ skip, take }).toEqual({ skip: 21, take: 21 });
    expect(orderBy).toEqual(PINNED_FIRST_ORDER);
  });

  it("keeps the upload and tells whether there is something to copy", async () => {
    findMany.mockResolvedValue([
      {
        ...rawItem,
        tags: [],
        contentType: "file",
        content: null,
        fileKey: "users/user-1/a.png",
        fileName: "a.png",
        fileSize: 10,
      },
    ]);

    const [record] = await getCollectionItemRecords("user-1", "col-1", 0, 21);

    expect(record).toMatchObject({
      canCopy: false,
      fileKey: "users/user-1/a.png",
      fileName: "a.png",
      fileSize: 10,
    });
    expect(record).not.toHaveProperty("content");
  });
});

describe("getCollectionTypeCounts", () => {
  it("counts only the caller's items linked to the collection, by type", async () => {
    groupBy.mockResolvedValue([
      { typeId: "t-note", _count: { _all: 30 } },
      { typeId: "t-image", _count: { _all: 2 } },
    ]);

    const counts = await getCollectionTypeCounts("user-1", "col-1");

    expect(groupBy.mock.calls[0][0].where).toEqual({
      userId: "user-1",
      collections: { some: { collectionId: "col-1" } },
    });
    expect(counts.get("t-note")).toBe(30);
    expect(counts.get("t-image")).toBe(2);
  });
});

describe("getUploadItemsByType", () => {
  beforeEach(() => {
    count.mockReset().mockResolvedValue(30);
    findMany.mockReset().mockResolvedValue([]);
  });

  it("counts and reads the same rows, one page of them, pinned first", async () => {
    const result = await getUploadItemsByType("user-1", "type-1", 2);

    const where = { userId: "user-1", typeId: "type-1" };
    const { skip, take, orderBy } = findMany.mock.calls[0][0];
    expect(count.mock.calls[0][0].where).toEqual(where);
    expect(findMany.mock.calls[0][0].where).toEqual(where);
    expect({ skip, take }).toEqual({ skip: 21, take: 21 });
    expect(orderBy).toEqual(PINNED_FIRST_ORDER);
    expect(result).toMatchObject({ totalCount: 30, page: 2, totalPages: 2 });
  });
});
