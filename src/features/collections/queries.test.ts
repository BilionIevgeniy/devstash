import { beforeEach, describe, expect, it, vi } from "vitest";

const { count, findFirst, findMany, findTypes } = vi.hoisted(() => ({
  count: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findTypes: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: { count, findFirst, findMany },
    itemType: { findMany: findTypes },
  },
}));

import {
  getCollectionById,
  getCollectionOptions,
  getFavoriteCollections,
  getSearchableCollections,
  getSidebarCollections,
  getUserCollections,
} from "@/features/collections/queries";

describe("getCollectionOptions", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
  });

  it("reads only the caller's collections", async () => {
    await getCollectionOptions("user-1");

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
  });

  // The item forms read this as ItemCollectionRef (ADR 0008), and the route
  // sends it as it is, so an added column would reach the browser.
  it("selects only the id and name, ordered by name", async () => {
    await getCollectionOptions("user-1");

    const { select, orderBy } = findMany.mock.calls[0][0];
    expect(select).toEqual({ id: true, name: true });
    expect(orderBy).toEqual({ name: "asc" });
  });
});

describe("getSidebarCollections", () => {
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      id: `col-${index}`,
      name: "React",
      description: null,
      isFavorite: true,
      _count: { items: 0 },
      items: [],
    }));

  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findTypes.mockReset().mockResolvedValue([]);
  });

  it("reads one row past the limit of the caller's two groups", async () => {
    await getSidebarCollections("user-1");

    const [favorites, recent] = findMany.mock.calls.map(([args]) => args);
    expect(favorites.where).toEqual({ userId: "user-1", isFavorite: true });
    expect(recent.where).toEqual({ userId: "user-1" });
    expect(favorites.take).toBe(6);
    expect(recent.take).toBe(6);
  });

  // A star leaves updatedAt alone: by that order a new favorite of an old
  // collection would fall past the limit and never show.
  it("orders favorites by the star and recent by the last change", async () => {
    await getSidebarCollections("user-1");

    const [favorites, recent] = findMany.mock.calls.map(([args]) => args);
    expect(favorites.orderBy).toEqual([
      { favoritedAt: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ]);
    expect(recent.orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  it("reports each group's overflow on its own", async () => {
    findMany.mockResolvedValueOnce(rows(6)).mockResolvedValueOnce(rows(5));

    const result = await getSidebarCollections("user-1");

    expect(result.favorites).toHaveLength(5);
    expect(result.hasMoreFavorites).toBe(true);
    expect(result.recent).toHaveLength(5);
    expect(result.hasMoreRecent).toBe(false);
  });
});

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

describe("getSearchableCollections", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findTypes.mockReset();
  });

  it("reads only the caller's collections, with no type lookup", async () => {
    await getSearchableCollections("user-1");

    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
    expect(findTypes).not.toHaveBeenCalled();
  });

  it("gives the item count as itemCount, in the shape the route sends", async () => {
    findMany.mockResolvedValue([
      { id: "col-1", name: "React", _count: { items: 3 } },
    ]);

    await expect(getSearchableCollections("user-1")).resolves.toEqual([
      { id: "col-1", name: "React", itemCount: 3 },
    ]);
  });
});

describe("getUserCollections", () => {
  beforeEach(() => {
    count.mockReset().mockResolvedValue(50);
    findMany.mockReset().mockResolvedValue([]);
    findTypes.mockReset().mockResolvedValue([]);
  });

  it("counts and reads only the caller's collections", async () => {
    await getUserCollections("user-1", 1);

    expect(count.mock.calls[0][0].where).toEqual({ userId: "user-1" });
    expect(findMany.mock.calls[0][0].where).toEqual({ userId: "user-1" });
  });

  it("reads only the rows of the page, in an order with no ties", async () => {
    const result = await getUserCollections("user-1", 2);

    const { skip, take, orderBy } = findMany.mock.calls[0][0];
    expect({ skip, take }).toEqual({ skip: 21, take: 21 });
    expect(orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
    expect(result).toMatchObject({ totalCount: 50, page: 2, totalPages: 3 });
  });
});

describe("getCollectionById", () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue(null);
  });

  it("only looks up collections that belong to the caller", async () => {
    await getCollectionById("user-1", "col-1");

    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: "col-1",
      userId: "user-1",
    });
  });

  it("returns null when the collection is missing or someone else's", async () => {
    await expect(getCollectionById("user-1", "col-1")).resolves.toBeNull();
  });
});
