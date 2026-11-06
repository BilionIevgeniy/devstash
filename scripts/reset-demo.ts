import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { isUserKey } from "../src/features/files/domain/file-rules";
import { PrismaClient } from "../src/generated/prisma/client";
import { deleteObject } from "../src/lib/r2";
import { DEMO_USER_EMAIL } from "../prisma/demo-user";
import { requireDevDatabase } from "./require-dev-database";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
requireDevDatabase(connectionString);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// A real Stripe customer would keep billing after its row is gone: that belongs
// to the cancel flow, not to a reset.
async function requireNoBillingCustomer(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });
  if (subscription?.stripeCustomerId) {
    throw new Error("Refusing to run: the demo user has a Stripe customer");
  }
}

// By exact key from the rows, not by prefix: an upload no row points to stays.
// Objects go first, so a failure leaves the rows that name them for a retry.
async function deleteFiles(userId: string) {
  const items = await prisma.item.findMany({
    where: { userId, fileKey: { not: null } },
    select: { fileKey: true },
  });
  const keys = items.flatMap(({ fileKey }) => (fileKey ? [fileKey] : []));

  const foreignKey = keys.find((key) => !isUserKey(userId, key));
  if (foreignKey) {
    throw new Error(`Refusing to run: ${foreignKey} is not the demo user's`);
  }

  for (const key of keys) {
    console.log(`Deleting ${key}`);
    await deleteObject(key);
  }
  return keys.length;
}

// The user, its password and its editor preferences stay.
async function main() {
  const { id: userId } = await prisma.user.findUniqueOrThrow({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });

  await requireNoBillingCustomer(userId);
  const files = await deleteFiles(userId);

  const [items, collections, tags, subscriptions] = await prisma.$transaction([
    prisma.item.deleteMany({ where: { userId } }),
    prisma.collection.deleteMany({ where: { userId } }),
    prisma.tag.deleteMany({ where: { userId } }),
    prisma.subscription.deleteMany({ where: { userId } }),
  ]);

  console.log(
    `Reset ${DEMO_USER_EMAIL}: ${files} file(s), ${items.count} item(s), ` +
      `${collections.count} collection(s), ${tags.count} tag(s), ` +
      `${subscriptions.count} subscription(s). Run npm run db:seed next`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
