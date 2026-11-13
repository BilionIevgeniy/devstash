import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  required,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { updateItemSchema } from "@/features/items/schemas";
import {
  deleteUserItem,
  setUserItemContent,
  setUserItemFavorite,
  setUserItemPin,
  updateUserItem,
} from "@/features/items/services/item";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/r2";

// Every write of `items/services/item.ts`: A with B's id gets "not found" and
// B's rows stay exactly as they were; the owner's call goes through, so the
// refusal is about the owner and not a broken call.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

const edit = (collectionIds: string[] = []) =>
  updateItemSchema.parse({
    title: "Changed",
    content: "changed",
    tags: ["changed"],
    collectionIds,
  });

const searchTagsOf = async (id: string) =>
  (
    await prisma.item.findUniqueOrThrow({
      where: { id },
      select: { searchTags: true },
    })
  ).searchTags;

describe("updateUserItem", () => {
  // The search vector reads the tags from this column (ADR 0018).
  it("writes searchTags on create and replaces them on update", async () => {
    expect(await searchTagsOf(t.a.items.snippet)).toBe("react shared");

    await updateUserItem(t.a.userId, t.a.items.snippet, edit());

    expect(await searchTagsOf(t.a.items.snippet)).toBe("changed");
  });

  it("refuses B's item for A and leaves B unchanged", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await updateUserItem(t.a.userId, t.b.items.note, edit());
    expect(result).toMatchObject({
      success: false,
      data: null,
      error: "itemNotFound",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);

    const own = await updateUserItem(t.b.userId, t.b.items.note, edit());
    expect(own.data?.title).toBe("Changed");
  });

  it("refuses to link A's item to B's collection", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await updateUserItem(
      t.a.userId,
      t.a.items.note,
      edit([t.b.collections.main]),
    );
    expect(result).toMatchObject({
      success: false,
      data: null,
      error: "itemOrCollectionNotFound",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
    const links = await prisma.itemCollection.count({
      where: { itemId: t.a.items.note },
    });
    expect(links).toBe(0);
  });

  // The orphan-tag cleanup after A's own edit runs with A's id only: B's
  // unused tag ("orphan") stays.
  it("cleans up only A's unused tags after A's own update", async () => {
    const before = await snapshotTenant(t.b.userId);
    const own = await updateUserItem(t.a.userId, t.a.items.note, edit());
    expect(own.success).toBe(true);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});

describe("setUserItemContent", () => {
  it("refuses B's item for A", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await setUserItemContent(t.a.userId, t.b.items.note, "x");
    expect(result).toMatchObject({
      success: false,
      data: null,
      error: "itemNotFound",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);

    const own = await setUserItemContent(t.b.userId, t.b.items.note, "new");
    expect(own.data?.content).toBe("new");
  });
});

// Raw SQL: the `userId` is in a hand-written WHERE, and the columns are named
// by hand, so only a real database proves either.
describe.each([
  ["setUserItemFavorite", setUserItemFavorite, "isFavorite"],
  ["setUserItemPin", setUserItemPin, "isPinned"],
] as const)("%s", (_name, toggle, column) => {
  it("refuses B's item for A and leaves B unchanged", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await toggle(t.a.userId, t.b.items.link, true);
    expect(result).toEqual({
      success: false,
      data: null,
      error: "itemNotFound",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("sets the column for the owner and leaves updatedAt alone", async () => {
    const before = await prisma.item.findUniqueOrThrow({
      where: { id: t.b.items.link },
    });
    const result = await toggle(t.b.userId, t.b.items.link, true);
    expect(result.success).toBe(true);
    const after = await prisma.item.findUniqueOrThrow({
      where: { id: t.b.items.link },
    });
    expect(after[column]).toBe(true);
    expect(after.updatedAt).toEqual(before.updatedAt);
  });
});

describe("deleteUserItem", () => {
  it("refuses B's item for A and leaves B unchanged", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await deleteUserItem(t.a.userId, required(t.b.items.file));
    expect(result).toEqual({
      success: false,
      data: null,
      error: "itemNotFound",
    });
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
    // R2 is outside the snapshot: B's object must not be touched either.
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("removes the owner's object under the owner's prefix", async () => {
    const own = await deleteUserItem(t.b.userId, required(t.b.items.file));
    expect(own.success).toBe(true);
    expect(vi.mocked(deleteObject).mock.calls).toEqual([
      [expect.stringMatching(new RegExp(`^users/${t.b.userId}/`))],
    ]);
  });

  it("deletes A's own item and only A's unused tags", async () => {
    const before = await snapshotTenant(t.b.userId);
    const own = await deleteUserItem(t.a.userId, t.a.items.snippet);
    expect(own.success).toBe(true);
    const aTags = await prisma.tag.findMany({ where: { userId: t.a.userId } });
    expect(aTags.map((tag) => tag.name)).toEqual(["shared"]);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});
