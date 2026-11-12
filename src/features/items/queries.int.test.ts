import { beforeAll, describe, expect, it } from "vitest";
import {
  allItemIds,
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../test/integration/fixtures";
import {
  getAllPinnedItems,
  getFavoriteItems,
  getItemEditState,
  getItemStats,
  getPinnedItems,
  getRecentItems,
  getSearchableItems,
  getSidebarItems,
} from "@/features/items/queries";

// Read-only: one seed for the file. Each list holds the caller's own rows and
// none of the other user's.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("item lists show only the caller's items", () => {
  it.each([
    ["getPinnedItems", getPinnedItems, "snippet"],
    ["getAllPinnedItems", getAllPinnedItems, "snippet"],
    ["getFavoriteItems", getFavoriteItems, "note"],
  ] as const)("%s", async (_name, read, own) => {
    const [a, b] = await Promise.all([read(t.a.userId), read(t.b.userId)]);
    expect(idsOf(a)).toEqual([t.a.items[own]]);
    expect(idsOf(b)).toEqual([t.b.items[own]]);
  });

  it.each([
    ["getRecentItems", getRecentItems],
    ["getSearchableItems", getSearchableItems],
  ] as const)("%s", async (_name, read) => {
    const [a, b] = await Promise.all([read(t.a.userId), read(t.b.userId)]);
    expect(idsOf(a).sort()).toEqual(allItemIds(t.a).sort());
    expect(idsOf(b).sort()).toEqual(allItemIds(t.b).sort());
  });

  it("getSidebarItems", async () => {
    const a = await getSidebarItems(t.a.userId);
    expect(idsOf(a.favorites)).toEqual([t.a.items.note]);
    expect(idsOf(a.pinned)).toEqual([t.a.items.snippet]);
  });
});

describe("getItemEditState", () => {
  it("returns the owner's item and nothing for anyone else", async () => {
    await expect(
      getItemEditState(t.b.userId, t.b.items.snippet),
    ).resolves.toEqual({
      typeName: "snippet",
      collectionIds: [t.b.collections.main],
    });
    await expect(
      getItemEditState(t.a.userId, t.b.items.snippet),
    ).resolves.toBeNull();
  });
});

describe("getItemStats", () => {
  it("counts the caller's items only", async () => {
    await expect(getItemStats(t.a.userId)).resolves.toEqual({
      total: 3,
      favorites: 1,
    });
    await expect(getItemStats(t.b.userId)).resolves.toEqual({
      total: 4,
      favorites: 1,
    });
  });
});
