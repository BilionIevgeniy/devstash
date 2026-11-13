import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  seedTenants,
  PASSWORD_OF_A,
  PASSWORD_OF_B,
  type Tenants,
} from "../../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../../test/integration/snapshot";
import { deleteAccount } from "@/features/account/_internal/services/delete-account";
import { prisma } from "@/lib/prisma";
import { deletePrefix } from "@/lib/r2";

// The whole delete flow of A, with the cascades of the real schema: nothing of
// B goes with it, in the database or in R2.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
});

describe("deleteAccount", () => {
  it("removes A with all of A's rows and leaves B intact", async () => {
    const before = await snapshotTenant(t.b.userId);

    const result = await deleteAccount(t.a.userId, {
      password: PASSWORD_OF_A,
    });

    expect(result).toEqual({ success: true, error: null, data: null });
    await expect(
      prisma.item.count({ where: { userId: t.a.userId } }),
    ).resolves.toBe(0);
    await expect(
      prisma.collection.count({ where: { userId: t.a.userId } }),
    ).resolves.toBe(0);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
    const prefixes = vi.mocked(deletePrefix).mock.calls.map(([p]) => p);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(prefixes.every((p) => p === `users/${t.a.userId}/`)).toBe(true);
  });

  // B's password is a real password of the app, so this fails only if the
  // check reads A's own hash.
  it("refuses A with B's password and deletes nothing", async () => {
    const before = await snapshotTenant(t.a.userId);
    const result = await deleteAccount(t.a.userId, { password: PASSWORD_OF_B });
    expect(result).toMatchObject({
      success: false,
      data: null,
      error: "incorrectPassword",
    });
    expect(await snapshotTenant(t.a.userId)).toEqual(before);
  });
});
