import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getSidebarItems } from "@/features/items/queries/sidebar";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("getSidebarItems", () => {
  it("shows only the caller's stars and pins", async () => {
    const a = await getSidebarItems(t.a.userId);
    expect(idsOf(a.favorites)).toEqual([t.a.items.note]);
    expect(idsOf(a.pinned)).toEqual([t.a.items.snippet]);
  });
});
