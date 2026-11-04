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

describe("getFavoriteCollections", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findTypes.mockReset();
  });

  it("reads only the caller's favorites, last changed first with no ties", async () => {
    await getFavoriteCollections("user-1");

    const { where, orderBy } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1", isFavorite: true });
    expect(orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  it("selects only what a row shows, with no type lookup", async () => {
    await getFavoriteCollections("user-1");

    expect(findMany.mock.calls[0][0].select).toEqual({
      id: true,
      name: true,
      updatedAt: true,
    });
    expect(findTypes).not.toHaveBeenCalled();
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
