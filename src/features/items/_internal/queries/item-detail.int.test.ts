import { beforeAll, describe, expect, it } from "vitest";
import {
  required,
  seedTenants,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import {
  getItemDetail,
  getItemDetailOfType,
  getItemFileKey,
} from "@/features/items/_internal/queries/item-detail";

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
    const own = await getItemDetailOfType(t.b.userId, t.b.items.note, "notes");
    expect(own?.id).toBe(t.b.items.note);
    await expect(
      getItemDetailOfType(t.a.userId, t.b.items.note, "notes"),
    ).resolves.toBeNull();
  });

  it("getItemFileKey, the read before a delete", async () => {
    const file = required(t.b.items.file);
    const own = await getItemFileKey(t.b.userId, file);
    expect(own?.fileKey).toMatch(new RegExp(`^users/${t.b.userId}/`));
    await expect(getItemFileKey(t.a.userId, file)).resolves.toBeNull();
  });
});
