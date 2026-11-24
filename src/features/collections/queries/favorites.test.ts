import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, findTypes } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findTypes: vi.fn(),
}));
vi.mock("@/lib/postgres/prisma", () => ({
  prisma: { collection: { findMany }, itemType: { findMany: findTypes } },
}));

import { getFavoriteCollections } from "@/features/collections/queries/favorites";

describe("getFavoriteCollections", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findTypes.mockReset().mockResolvedValue([]);
  });

  it("reads only the caller's favorites, last starred first with no ties", async () => {
    await getFavoriteCollections("user-1");

    const { where, orderBy } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1", isFavorite: true });
    expect(orderBy).toEqual([
      { favoritedAt: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ]);
  });

  it("falls back to the last change for a favorite with no star date", async () => {
    const updatedAt = new Date("2026-02-01T00:00:00Z");
    findMany.mockResolvedValue([
      { id: "c-1", name: "React", favoritedAt: null, updatedAt, items: [] },
    ]);

    await expect(getFavoriteCollections("user-1")).resolves.toEqual([
      { id: "c-1", name: "React", favoritedAt: updatedAt },
    ]);
  });

  // The row's folder has to match the border of the collection's card.
  it("takes the colour of the most used type, and none when empty", async () => {
    const favoritedAt = new Date("2026-02-01T00:00:00Z");
    const typed = (typeId: string) => ({ item: { typeId } });
    findMany.mockResolvedValue([
      {
        id: "c-1",
        name: "React",
        favoritedAt,
        updatedAt: favoritedAt,
        items: [typed("note"), typed("snippet"), typed("snippet")],
      },
      {
        id: "c-2",
        name: "Empty",
        favoritedAt,
        updatedAt: favoritedAt,
        items: [],
      },
    ]);
    findTypes.mockResolvedValue([
      { id: "note", name: "note", icon: "StickyNote", color: "#fde047" },
      { id: "snippet", name: "snippet", icon: "Code", color: "#3b82f6" },
    ]);

    const [used, empty] = await getFavoriteCollections("user-1");

    expect(used.color).toBe("#3b82f6");
    expect(empty.color).toBeUndefined();
  });

  it("selects no counts or descriptions, which a row does not show", async () => {
    await getFavoriteCollections("user-1");

    const { select } = findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty("_count");
    expect(select).not.toHaveProperty("description");
  });
});
