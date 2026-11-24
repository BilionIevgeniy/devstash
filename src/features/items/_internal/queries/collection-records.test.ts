import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, groupBy } = vi.hoisted(() => ({
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { item: { findMany, groupBy } },
}));

import {
  getCollectionItemRecords,
  getCollectionTypeCounts,
} from "@/features/items/_internal/queries/collection-records";

const PINNED_FIRST_ORDER = [
  { isPinned: "desc" },
  { createdAt: "desc" },
  { id: "desc" },
];

const rawItem = {
  id: "item-1",
  title: "useAuth Hook",
  description: null,
  isFavorite: true,
  isPinned: false,
  createdAt: new Date("2026-01-15T00:00:00Z"),
  url: null,
  type: { id: "type-1", name: "file", icon: "File", color: "#6b7280" },
};

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
