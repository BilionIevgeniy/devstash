import { beforeEach, describe, expect, it } from "vitest";
import {
  idsOf,
  required,
  seedTenants,
  systemTypeId,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { getUserCollectionListing } from "@/features/items/services/collection-listing";
import { getUserFileListItems } from "@/features/items/services/file-list";
import { getUserGalleryItems } from "@/features/items/services/gallery";
import {
  getUserItemDetail,
  getUserItemDetailOfType,
  openUserItem,
} from "@/features/items/services/item-detail";
import {
  getUserLockedFileCount,
  getUserLockedFiles,
} from "@/features/items/services/locked-files";
import { prisma } from "@/lib/prisma";

// The read services of `items` (item-detail, collection-listing, file-list,
// gallery, locked-files) in one file: each is a thin shape over a scoped
// query, so one case each, owner first. `beforeEach`, since the locked-files
// case changes B's plan.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

describe("item-detail", () => {
  it("getUserItemDetail and getUserItemDetailOfType", async () => {
    const own = await getUserItemDetail(t.b.userId, required(t.b.items.file));
    expect(own?.file?.downloadUrl).toContain(`users/${t.b.userId}/`);
    await expect(
      getUserItemDetail(t.a.userId, required(t.b.items.file)),
    ).resolves.toBeNull();
    await expect(
      getUserItemDetailOfType(t.a.userId, t.b.items.note, "note"),
    ).resolves.toBeNull();
  });

  it("openUserItem: someone else's item is missing, not locked", async () => {
    const own = await openUserItem(t.b.userId, t.b.items.snippet);
    expect(own.status).toBe("ok");
    await expect(
      openUserItem(t.a.userId, required(t.b.items.file)),
    ).resolves.toEqual({ status: "missing" });
  });
});

describe("collection-listing", () => {
  it("lists nothing of B's collection for A", async () => {
    const own = await getUserCollectionListing(
      t.b.userId,
      t.b.collections.main,
      1,
    );
    expect(own.itemCount).toBe(1);
    const other = await getUserCollectionListing(
      t.a.userId,
      t.b.collections.main,
      1,
    );
    expect(other.itemCount).toBe(0);
    expect(other.sections).toEqual([]);
  });
});

describe("file-list and gallery", () => {
  it("show only the caller's uploads", async () => {
    const file = await systemTypeId("file");
    const own = await getUserFileListItems(t.b.userId, file, 1);
    expect(idsOf(own.items)).toEqual([t.b.items.file]);
    const other = await getUserFileListItems(t.a.userId, file, 1);
    expect(other.items).toEqual([]);
    const gallery = await getUserGalleryItems(t.a.userId, file, 1);
    expect(gallery.items).toEqual([]);
  });
});

describe("locked-files", () => {
  it("counts and lists only the caller's uploads once B is on Free", async () => {
    await prisma.subscription.delete({ where: { userId: t.b.userId } });
    await expect(getUserLockedFileCount(t.b.userId)).resolves.toBe(1);
    await expect(getUserLockedFileCount(t.a.userId)).resolves.toBe(0);
    const own = await getUserLockedFiles(t.b.userId, 1);
    expect(idsOf(own.items)).toEqual([t.b.items.file]);
    const other = await getUserLockedFiles(t.a.userId, 1);
    expect(other.items).toEqual([]);
  });
});
