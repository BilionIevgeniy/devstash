import { beforeEach, describe, expect, it } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { snapshotTenant } from "../../../../test/integration/snapshot";
import { purgeStaleRegistrations } from "@/features/account/services/retention";
import { prisma } from "@/lib/postgres/prisma";

// Only a registration with a password, never verified and older than 7 days
// goes, with its tokens. A young one, a GitHub account (also unverified to
// Auth.js) and the verified tenants stay; B's rows are unchanged.
let t: Tenants;
const DAY = 24 * 60 * 60 * 1000;

beforeEach(async () => {
  t = await seedTenants();
});

async function registration(
  email: string,
  ageDays: number,
  options: { password?: string | null; github?: boolean } = {},
): Promise<string> {
  const { id } = await prisma.user.create({
    data: {
      email,
      password: options.password === undefined ? "hash" : options.password,
      createdAt: new Date(Date.now() - ageDays * DAY),
      ...(options.github && {
        accounts: {
          create: {
            type: "oauth",
            provider: "github",
            providerAccountId: `gh-${email}`,
          },
        },
      }),
    },
  });
  return id;
}

function context() {
  return { now: new Date(), deadline: Date.now() + 45_000 };
}

describe("purgeStaleRegistrations", () => {
  it("deletes a stale unverified registration and nothing else, and nothing on a second run", async () => {
    const stale = await registration("stale@example.com", 8);
    await prisma.verificationToken.create({
      data: {
        identifier: "stale@example.com",
        token: "token-of-stale",
        expires: new Date(Date.now() + DAY),
      },
    });
    const young = await registration("young@example.com", 6);
    const github = await registration("gh@example.com", 30, {
      password: null,
      github: true,
    });
    const before = await snapshotTenant(t.b.userId);

    await expect(purgeStaleRegistrations(context())).resolves.toEqual({
      counts: { deleted: 1, skipped: 0, failed: 0 },
      stoppedEarly: false,
    });
    await expect(purgeStaleRegistrations(context())).resolves.toEqual({
      counts: { deleted: 0, skipped: 0, failed: 0 },
      stoppedEarly: false,
    });

    const left = await prisma.user.findMany({ select: { id: true } });
    const leftIds = left.map(({ id }) => id);
    expect(leftIds).not.toContain(stale);
    expect(leftIds).toEqual(
      expect.arrayContaining([young, github, t.a.userId, t.b.userId]),
    );
    await expect(
      prisma.verificationToken.count({
        where: { identifier: "stale@example.com" },
      }),
    ).resolves.toBe(0);
    expect(await snapshotTenant(t.b.userId)).toEqual(before);
  });
});
