import { beforeAll, describe, expect, it } from "vitest";
import {
  allItemIds,
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import {
  getItemCount,
  getItemStats,
  getPinnedItems,
  getRecentItems,
} from "@/features/items/queries/dashboard";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("the dashboard shows only the caller's items", () => {
  it("getPinnedItems", async () => {
    const [a, b] = await Promise.all([
      getPinnedItems(t.a.userId),
      getPinnedItems(t.b.userId),
    ]);
    expect(idsOf(a)).toEqual([t.a.items.snippet]);
    expect(idsOf(b)).toEqual([t.b.items.snippet]);
  });

  it("getRecentItems", async () => {
    const [a, b] = await Promise.all([
      getRecentItems(t.a.userId),
      getRecentItems(t.b.userId),
    ]);
    expect(idsOf(a).sort()).toEqual(allItemIds(t.a).sort());
    expect(idsOf(b).sort()).toEqual(allItemIds(t.b).sort());
  });

  it("getItemCount", async () => {
    await expect(getItemCount(t.a.userId)).resolves.toBe(3);
    await expect(getItemCount(t.b.userId)).resolves.toBe(4);
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
