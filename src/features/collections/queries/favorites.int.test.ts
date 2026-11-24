import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getFavoriteCollections } from "@/features/collections/queries/favorites";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getFavoriteCollections", () => {
  it("shows only the caller's favorites", async () => {
    const a = await getFavoriteCollections(t.a.userId);
    expect(idsOf(a)).toEqual([t.a.collections.favorite]);
  });
});
