import bcrypt from "bcryptjs";
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { E2E_USER_PASSWORD } from "./e2e-user";

// Rows the end-to-end seed (scripts/seed-e2e.ts) and the per-test users
// (scripts/e2e-fixture.ts) both write. Written directly, not through the
// services: the journeys read them, and rows past the Free limit must be
// possible.

// Low cost on purpose: only the tests read this hash.
const TEST_BCRYPT_ROUNDS = 4;

const PRO_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export function hashTestPassword(): Promise<string> {
  return bcrypt.hash(E2E_USER_PASSWORD, TEST_BCRYPT_ROUNDS);
}

// An active subscription row, as the Stripe sync writes one, so
// getEntitlements gives Pro. The Stripe ids are unique per user.
export async function makePro(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.subscription.create({
    data: {
      userId,
      status: "active",
      stripeCustomerId: `cus_e2e_${userId}`,
      stripeSubscriptionId: `sub_e2e_${userId}`,
      currentPeriodEnd: new Date(Date.now() + PRO_PERIOD_MS),
    },
  });
}

type SnippetExtra = Partial<
  Pick<
    Prisma.ItemCreateManyInput,
    | "isFavorite"
    | "favoritedAt"
    | "isPinned"
    | "createdAt"
    | "description"
    | "language"
  >
>;

// `count` snippets titled "<label> 01" and up, with `extra(i)` for the flags
// and dates of row i.
export async function writeSnippets(
  prisma: PrismaClient,
  userId: string,
  count: number,
  label: string,
  extra: (index: number) => SnippetExtra = () => ({}),
): Promise<void> {
  const snippet = await prisma.itemType.findFirstOrThrow({
    where: { name: "snippet", isSystem: true },
    select: { id: true },
  });
  await prisma.item.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      userId,
      typeId: snippet.id,
      contentType: "TEXT",
      title: `${label} ${String(i + 1).padStart(2, "0")}`,
      content: `echo ${i + 1}`,
      ...extra(i),
    })),
  });
}
