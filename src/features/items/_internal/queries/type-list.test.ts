import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { item: { findMany } } }));

import { getUploadItemsOfType } from "@/features/items/_internal/queries/type-list";

describe("getUploadItemsOfType", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([
      {
        id: "item-1",
        title: "Cat",
        description: null,
        isFavorite: false,
        isPinned: false,
        createdAt: new Date("2026-01-15T00:00:00Z"),
        type: { id: "type-1", name: "image", icon: "Image", color: "#ec4899" },
        tags: [{ tag: { name: "pets" } }],
        fileKey: "users/user-1/a.png",
        fileName: "cat.png",
        fileSize: 120,
      },
    ]);
  });

  it("reads the caller's rows of the type with the tag, in the sort, at the position", async () => {
    const [item] = await getUploadItemsOfType(
      "user-1",
      "type-1",
      { sort: "a-z", tag: "pets" },
      21,
      21,
    );

    const { where, orderBy, skip, take } = findMany.mock.calls[0][0];
    expect(where).toEqual({
      userId: "user-1",
      typeId: "type-1",
      tags: { some: { tag: { userId: "user-1", name: "pets" } } },
    });
    expect(orderBy).toEqual([
      { isPinned: "desc" },
      { title: "asc" },
      { id: "asc" },
    ]);
    expect({ skip, take }).toEqual({ skip: 21, take: 21 });
    expect(item).toMatchObject({
      tags: ["pets"],
      fileKey: "users/user-1/a.png",
      fileName: "cat.png",
      fileSize: 120,
    });
  });
});
