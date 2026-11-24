import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  systemTypeId,
  seedTenants,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import {
  getCollectionItemRecords,
  getCollectionTypeCounts,
} from "@/features/items/_internal/queries/collection-records";

// Read-only: one seed for the file. The owner's call finds the row first, so
// an empty answer for A means "not yours", not "wrong fixture id".
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("reads of B's collection by A", () => {
  it("getCollectionTypeCounts", async () => {
    const snippet = await systemTypeId("snippet");
    const own = await getCollectionTypeCounts(t.b.userId, t.b.collections.main);
    expect([...own]).toEqual([[snippet, 1]]);
    const other = await getCollectionTypeCounts(
      t.a.userId,
      t.b.collections.main,
    );
    expect(other.size).toBe(0);
  });

  it("getCollectionItemRecords", async () => {
    const own = await getCollectionItemRecords(
      t.b.userId,
      t.b.collections.main,
      0,
      10,
    );
    expect(idsOf(own)).toEqual([t.b.items.snippet]);
    await expect(
      getCollectionItemRecords(t.a.userId, t.b.collections.main, 0, 10),
    ).resolves.toEqual([]);
  });
});
