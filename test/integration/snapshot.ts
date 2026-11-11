import { prisma } from "@/lib/prisma";

// Every row a user owns, in a stable order, so a test can compare B before and
// after A's call with `toEqual`. Timestamps are included: a write that touches
// a row (an `updatedAt` bump) counts as a change.
export async function snapshotTenant(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true,
      password: true,
      sessionVersion: true,
      updatedAt: true,
    },
  });
  const [items, collections, tags, subscription, preference, accounts, tokens] =
    await Promise.all([
      prisma.item.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        include: {
          tags: { orderBy: { tagId: "asc" } },
          collections: { orderBy: { collectionId: "asc" } },
        },
      }),
      prisma.collection.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      prisma.tag.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.userPreference.findUnique({ where: { userId } }),
      prisma.account.findMany({ where: { userId }, orderBy: { id: "asc" } }),
      prisma.verificationToken.findMany({
        where: { identifier: user.email },
        orderBy: { token: "asc" },
      }),
    ]);
  return {
    user,
    items,
    collections,
    tags,
    subscription,
    preference,
    accounts,
    tokens,
  };
}
