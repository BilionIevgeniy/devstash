import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  required,
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { sweepUnclaimedUploads } from "@/features/items/services/upload-sweep";
import { prisma } from "@/lib/postgres/prisma";
import { deleteObjects, listObjectsPage } from "@/lib/vendors/r2";

// The sweep reads every user's objects at once, so the cross-user case is the
// whole test: only A's old object that no item holds goes; A's held and young
// objects stay, and so does every object of B.
let t: Tenants;
const HOUR = 60 * 60 * 1000;

beforeEach(async () => {
  t = await seedTenants();
});

function object(key: string, hoursAgo: number) {
  return { key, lastModified: new Date(Date.now() - hoursAgo * HOUR) };
}

async function fileKeyOf(itemId: string): Promise<string> {
  const item = await prisma.item.findUniqueOrThrow({
    where: { id: itemId },
    select: { fileKey: true },
  });
  return required(item.fileKey);
}

describe("sweepUnclaimedUploads", () => {
  it("deletes A's old unclaimed object and nothing of A's held or young ones, or of B", async () => {
    const heldByA = `users/${t.a.userId}/held.pdf`;
    await prisma.item.update({
      where: { id: t.a.items.note },
      data: { fileKey: heldByA },
    });
    const unclaimedOfA = `users/${t.a.userId}/unclaimed.png`;
    const heldByB = await fileKeyOf(required(t.b.items.file));
    vi.mocked(listObjectsPage)
      .mockResolvedValueOnce({
        objects: [
          object(unclaimedOfA, 25),
          object(heldByA, 25),
          object(`users/${t.a.userId}/young.png`, 2),
        ],
        next: "page-2",
      })
      .mockResolvedValue({
        objects: [
          object(heldByB, 25),
          object(`users/${t.b.userId}/young.png`, 1),
        ],
        next: undefined,
      });
    const before = await snapshotTenant(t.b.userId);
    const context = { now: new Date(), deadline: Date.now() + 45_000 };

    await expect(sweepUnclaimedUploads(context)).resolves.toEqual({
      counts: { scanned: 5, deleted: 1 },
      stoppedEarly: false,
    });

    const deletedKeys = vi.mocked(deleteObjects).mock.calls.flat(2);
    expect(deletedKeys).toEqual([unclaimedOfA]);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });

  it("stops at the deadline without listing", async () => {
    const result = await sweepUnclaimedUploads({
      now: new Date(),
      deadline: Date.now() - 1,
    });

    expect(result).toEqual({
      counts: { scanned: 0, deleted: 0 },
      stoppedEarly: true,
    });
    expect(listObjectsPage).not.toHaveBeenCalled();
  });
});
