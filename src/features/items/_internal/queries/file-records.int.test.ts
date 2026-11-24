import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  seedTenants,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import {
  countFileItems,
  getFileItemRecords,
} from "@/features/items/_internal/queries/file-records";

// Read-only: one seed for the file.
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("reads of uploads", () => {
  it("countFileItems and getFileItemRecords", async () => {
    await expect(countFileItems(t.b.userId)).resolves.toBe(1);
    await expect(countFileItems(t.a.userId)).resolves.toBe(0);
    const own = await getFileItemRecords(t.b.userId, 1);
    expect(idsOf(own.items)).toEqual([t.b.items.file]);
    const other = await getFileItemRecords(t.a.userId, 1);
    expect(other.items).toEqual([]);
  });
});
