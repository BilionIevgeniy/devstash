import { beforeAll, describe, expect, it } from "vitest";
import {
  idsOf,
  required,
  seedTenants,
  systemTypeId,
  type Tenants,
} from "../../../../test/integration/fixtures";
import {
  countFileItems,
  getCollectionItemRecords,
  getCollectionTypeCounts,
  getFileItemRecords,
  getItemDetail,
  getItemDetailOfType,
  getItemFileKey,
} from "@/features/items/_internal/queries";

// Read-only: one seed for the file. The owner's call finds the row first, so
// an empty answer for A means "not yours", not "wrong fixture id".
let t: Tenants;

beforeAll(async () => {
  t = await seedTenants();
});

describe("reads of one item by id", () => {
  it("getItemDetail", async () => {
    const own = await getItemDetail(t.b.userId, t.b.items.snippet);
    expect(own?.id).toBe(t.b.items.snippet);
    await expect(
      getItemDetail(t.a.userId, t.b.items.snippet),
    ).resolves.toBeNull();
  });

  it("getItemDetailOfType", async () => {
    const own = await getItemDetailOfType(t.b.userId, t.b.items.note, "note");
    expect(own?.id).toBe(t.b.items.note);
    await expect(
      getItemDetailOfType(t.a.userId, t.b.items.note, "note"),
    ).resolves.toBeNull();
  });

  it("getItemFileKey, the read before a delete", async () => {
    const file = required(t.b.items.file);
    const own = await getItemFileKey(t.b.userId, file);
    expect(own?.fileKey).toMatch(new RegExp(`^users/${t.b.userId}/`));
    await expect(getItemFileKey(t.a.userId, file)).resolves.toBeNull();
  });
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
