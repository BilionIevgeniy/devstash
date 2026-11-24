import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import {
  getCollectionStats,
  getRecentCollections,
} from "@/features/collections/queries/dashboard";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

const both = (tenant: Tenants["a"]) =>
  [tenant.collections.main, tenant.collections.favorite].sort();

describe("the dashboard shows only the caller's collections", () => {
  it("getRecentCollections", async () => {
    expect(idsOf(await getRecentCollections(t.a.userId)).sort()).toEqual(
      both(t.a),
    );
    expect(idsOf(await getRecentCollections(t.b.userId)).sort()).toEqual(
      both(t.b),
    );
  });

  it("getCollectionStats", async () => {
    await expect(getCollectionStats(t.a.userId)).resolves.toEqual({
      total: 2,
      favorites: 1,
    });
  });
});
