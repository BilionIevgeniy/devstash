import { beforeEach, describe, expect, it } from "vitest";
import {
  seedTenants,
  type Tenants,
} from "../../../../test/integration/fixtures";
import { FREE_ITEM_LIMIT } from "@/features/billing/domain/limits";
import { userCanEditText } from "@/features/items/services/text-access";
import { prisma } from "@/lib/postgres/prisma";

// The text lock counts the caller's own items only: B, a former Pro user far
// over the limit, is locked, and A on Free with a few items is not.
let t: Tenants;

beforeEach(async () => {
  t = await seedTenants();
  await prisma.subscription.update({
    where: { userId: t.b.userId },
    data: { status: "canceled", stripeSubscriptionId: null },
  });
  const snippet = await prisma.itemType.findFirstOrThrow({
    where: { isSystem: true, name: "snippet" },
  });
  await prisma.item.createMany({
    data: Array.from({ length: FREE_ITEM_LIMIT + 1 }, (_, index) => ({
      userId: t.b.userId,
      typeId: snippet.id,
      title: `B ${index}`,
      contentType: "TEXT",
    })),
  });
});

describe("userCanEditText", () => {
  it("locks the owner of the many items and no other user", async () => {
    expect(await userCanEditText(t.b.userId)).toBe(false);
    expect(await userCanEditText(t.a.userId)).toBe(true);
  });
});
