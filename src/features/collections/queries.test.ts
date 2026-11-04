import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst, findMany, findTypes } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findTypes: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    collection: { findFirst, findMany },
    itemType: { findMany: findTypes },
  },
}));

import {
  getCollectionById,
  getCollectionOptions,
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

describe("getUserCollections", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    findTypes.mockReset().mockResolvedValue([]);
  });

  it("reads all of the caller's collections, with no limit", async () => {
    await getUserCollections("user-1");

    const { where, take } = findMany.mock.calls[0][0];
    expect(where).toEqual({ userId: "user-1" });
    expect(take).toBeUndefined();
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
