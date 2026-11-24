import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import {
  getCollectionById,
  getCollectionOptions,
  getUserCollections,
} from "@/features/collections/queries/list";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

const both = (tenant: Tenants["a"]) =>
  [tenant.collections.main, tenant.collections.favorite].sort();

describe("the lists show only the caller's collections", () => {
  it("getCollectionOptions", async () => {
    expect(idsOf(await getCollectionOptions(t.a.userId)).sort()).toEqual(
      both(t.a),
    );
    expect(idsOf(await getCollectionOptions(t.b.userId)).sort()).toEqual(
      both(t.b),
    );
  });

  it("getUserCollections", async () => {
    const a = await getUserCollections(t.a.userId, 1);
    expect(idsOf(a.items).sort()).toEqual(both(t.a));
    expect(a.totalCount).toBe(2);
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
