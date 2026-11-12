import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../test/integration/fixtures";
import {
  getCollectionById,
  getCollectionOptions,
  getCollectionStats,
  getFavoriteCollections,
  getRecentCollections,
  getSidebarCollections,
  getUserCollections,
} from "@/features/collections/queries";
import { getRecentSearchableCollections } from "@/features/collections/queries/search";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

const both = (tenant: Tenants["a"]) =>
  [tenant.collections.main, tenant.collections.favorite].sort();

describe("collection lists show only the caller's collections", () => {
  it.each([
    ["getRecentCollections", getRecentCollections],
    ["getCollectionOptions", getCollectionOptions],
    ["getRecentSearchableCollections", getRecentSearchableCollections],
  ] as const)("%s", async (_name, read) => {
    expect(idsOf(await read(t.a.userId)).sort()).toEqual(both(t.a));
    expect(idsOf(await read(t.b.userId)).sort()).toEqual(both(t.b));
  });

  it("getUserCollections", async () => {
    const a = await getUserCollections(t.a.userId, 1);
    expect(idsOf(a.items).sort()).toEqual(both(t.a));
    expect(a.totalCount).toBe(2);
  });

  it("getSidebarCollections", async () => {
    const a = await getSidebarCollections(t.a.userId);
    expect(idsOf(a.favorites)).toEqual([t.a.collections.favorite]);
    expect(idsOf(a.recent).sort()).toEqual(both(t.a));
  });

  it("getFavoriteCollections", async () => {
    const a = await getFavoriteCollections(t.a.userId);
    expect(idsOf(a)).toEqual([t.a.collections.favorite]);
  });

  it("getCollectionStats", async () => {
    await expect(getCollectionStats(t.a.userId)).resolves.toEqual({
      total: 2,
      favorites: 1,
    });
  });
});

describe("getCollectionById", () => {
  it("returns the owner's collection and nothing for anyone else", async () => {
    const own = await getCollectionById(t.b.userId, t.b.collections.main);
    expect(own?.id).toBe(t.b.collections.main);
    await expect(
      getCollectionById(t.a.userId, t.b.collections.main),
    ).resolves.toBeNull();
  });
});
