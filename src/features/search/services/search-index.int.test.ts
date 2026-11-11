import { beforeAll, describe, expect, it } from "vitest";
import {
  allItemIds,
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getSearchIndex } from "@/features/search/services/search-index";

let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getSearchIndex", () => {
  it("holds the caller's items and collections only", async () => {
    const a = await getSearchIndex(t.a.userId);
    expect(idsOf(a.items).sort()).toEqual(allItemIds(t.a).sort());
    expect(idsOf(a.collections).sort()).toEqual(
      [t.a.collections.main, t.a.collections.favorite].sort(),
    );
    const b = await getSearchIndex(t.b.userId);
    expect(idsOf(b.items).sort()).toEqual(allItemIds(t.b).sort());
  });
});
