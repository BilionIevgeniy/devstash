import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  seedTenants,
  systemTypeId,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { FREE_ITEM_LIMIT } from "@/features/billing/domain/limits";
import { contentTypeFor } from "@/features/items/domain/item-fields";
import { createItemSchema } from "@/features/items/schemas";
import { createUserItem } from "@/features/items/services/create-item";
import { prisma } from "@/lib/prisma";
import { headObject } from "@/lib/r2";

let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

const note = (input: object = {}) =>
  createItemSchema.parse({
    typeName: "note",
    title: "New",
    tags: [],
    collectionIds: [],
    ...input,
  });

describe("createUserItem across users", () => {
  it("refuses B's collection and creates nothing", async () => {
    const before = await snapshotTenant(t.b.userId);
    const count = await prisma.item.count({ where: { userId: t.a.userId } });
    const result = await createUserItem(
      t.a.userId,
      note({ collectionIds: [t.b.collections.main] }),
    );
    expect(result).toMatchObject({
      success: false,
      data: null,
      error: "collectionGone",
    });
    expect(await prisma.item.count({ where: { userId: t.a.userId } })).toBe(
      count,
    );
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("gives A its own tag when B has one of the same name", async () => {
    const before = await snapshotTenant(t.b.userId);
    const result = await createUserItem(t.a.userId, note({ tags: ["orphan"] }));
    expect(result.success).toBe(true);
    const tag = await prisma.itemTag.findFirstOrThrow({
      where: { itemId: result.data?.id },
      include: { tag: true },
    });
    expect(tag.tag.userId).toBe(t.a.userId);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  // A on Pro and an object R2 would confirm: the prefix is the only reason
  // left to refuse B's upload.
  it("refuses an upload under B's prefix", async () => {
    await prisma.subscription.create({
      data: { userId: t.a.userId, status: "active" },
    });
    vi.mocked(headObject).mockResolvedValue({
      size: 10,
      contentType: "application/pdf",
    });
    const before = await snapshotTenant(t.b.userId);
    const result = await createUserItem(
      t.a.userId,
      createItemSchema.parse({
        typeName: "file",
        title: "Not mine",
        tags: [],
        collectionIds: [],
        file: { key: `users/${t.b.userId}/other.pdf`, name: "other.pdf" },
      }),
    );
    expect(result.success).toBe(false);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);

    const own = await createUserItem(
      t.a.userId,
      createItemSchema.parse({
        typeName: "file",
        title: "Mine",
        tags: [],
        collectionIds: [],
        file: { key: `users/${t.a.userId}/mine.pdf`, name: "mine.pdf" },
      }),
    );
    expect(own.success).toBe(true);
  });
});

// The advisory lock in insertItem: without it the creates all count 49 and
// several insert. Eight calls run at once on the pool's connections, so a run
// where they happen not to overlap is unlikely.
const RACERS = 8;
describe("the Free item limit under a race", () => {
  it("ends at exactly the limit", async () => {
    const typeId = await systemTypeId("note");
    const have = await prisma.item.count({ where: { userId: t.a.userId } });
    await prisma.item.createMany({
      data: Array.from({ length: FREE_ITEM_LIMIT - 1 - have }, (_, i) => ({
        userId: t.a.userId,
        typeId,
        contentType: contentTypeFor("note"),
        title: `Filler ${i}`,
      })),
    });

    const results = await Promise.all(
      Array.from({ length: RACERS }, (_, i) =>
        createUserItem(t.a.userId, note({ title: `Racer ${i}` })),
      ),
    );

    expect(results.filter((r) => r.success)).toHaveLength(1);
    const refused = results.filter((r) => !r.success);
    expect(refused).toHaveLength(RACERS - 1);
    for (const result of refused) {
      expect(result.error).toBe("itemLimitReached");
    }
    await expect(
      prisma.item.count({ where: { userId: t.a.userId } }),
    ).resolves.toBe(FREE_ITEM_LIMIT);
  });
});
