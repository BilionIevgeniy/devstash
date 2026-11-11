import { beforeEach, describe, expect, it } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import {
  createUserCollection,
  deleteUserCollection,
  setUserCollectionFavorite,
  updateUserCollection,
} from "@/features/collections/services/collection";
import { prisma } from "@/lib/prisma";

// A with B's collection id: "no longer exists", and B's rows are unchanged.
// The owner's call goes through, so the refusal is about the owner.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

const NOT_FOUND = {
  success: false,
  error: "This collection no longer exists.",
};

describe.each([
  [
    "updateUserCollection",
    (userId: string, id: string) =>
      updateUserCollection(userId, id, { name: "Renamed", description: null }),
  ],
  [
    "setUserCollectionFavorite",
    (userId: string, id: string) =>
      setUserCollectionFavorite(userId, id, false),
  ],
  ["deleteUserCollection", deleteUserCollection],
] as const)("%s", (_name, write) => {
  it("refuses B's collection for A and leaves B unchanged", async () => {
    const before = await snapshotTenant(t.b.userId);
    await expect(write(t.a.userId, t.b.collections.favorite)).resolves.toEqual(
      NOT_FOUND,
    );
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("lets the owner do it", async () => {
    const result = await write(t.b.userId, t.b.collections.favorite);
    expect(result.success).toBe(true);
  });
});

describe("createUserCollection", () => {
  it("creates the collection for the caller only", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await createUserCollection(t.a.userId, {
      name: "New",
      description: null,
    });
    expect(result.success).toBe(true);
    const created = await prisma.collection.findFirstOrThrow({
      where: { name: "New" },
    });
    expect(created.userId).toBe(t.a.userId);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

// Raw SQL: the column names and the WHERE are written by hand.
describe("setUserCollectionFavorite", () => {
  it("sets the columns and leaves updatedAt alone", async () => {
    const id = t.b.collections.main;
    const before = await prisma.collection.findUniqueOrThrow({ where: { id } });
    await setUserCollectionFavorite(t.b.userId, id, true);
    const after = await prisma.collection.findUniqueOrThrow({ where: { id } });
    expect(after.isFavorite).toBe(true);
    expect(after.favoritedAt).not.toBeNull();
    expect(after.updatedAt).toEqual(before.updatedAt);
  });
});
