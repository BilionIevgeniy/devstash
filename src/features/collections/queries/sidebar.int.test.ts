import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getSidebarCollections } from "@/features/collections/queries/sidebar";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getSidebarCollections", () => {
  it("shows only the caller's collections", async () => {
    const a = await getSidebarCollections(t.a.userId);
    expect(idsOf(a.favorites)).toEqual([t.a.collections.favorite]);
    expect(idsOf(a.recent).sort()).toEqual(
      [t.a.collections.main, t.a.collections.favorite].sort(),
    );
  });
});
