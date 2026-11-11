import { systemItemTypes } from "../prisma/seed-data";
import type { PrismaClient } from "../src/generated/prisma/client";

// The test database: emptied and seeded before the integration tests, and by
// `npm run db:seed-test` for the end-to-end tests that come later. The caller
// has already passed requireTestDatabase; this module only takes the client.

export const TEST_FREE_USER_EMAIL = "free@devstash.test";
export const TEST_PRO_USER_EMAIL = "pro@devstash.test";

const PERIOD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TestUsers {
  freeUserId: string;
  proUserId: string;
}

// Every table of the schema, read from the catalog so a new model is never
// left out. The names come from Postgres, not from any input; they are quoted
// because Prisma's table names are mixed case.
async function truncateAllTables(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables
    .map(({ tablename }) => `"public"."${tablename.replaceAll('"', '""')}"`)
    .join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

async function createTestUsers(prisma: PrismaClient): Promise<TestUsers> {
  const emailVerified = new Date();
  const free = await prisma.user.create({
    data: { email: TEST_FREE_USER_EMAIL, name: "Free Tester", emailVerified },
    select: { id: true },
  });
  const pro = await prisma.user.create({
    data: {
      email: TEST_PRO_USER_EMAIL,
      name: "Pro Tester",
      emailVerified,
      subscription: {
        create: {
          status: "active",
          stripeCustomerId: "cus_test_pro",
          stripeSubscriptionId: "sub_test_pro",
          currentPeriodEnd: new Date(Date.now() + PERIOD_DAYS * DAY_MS),
        },
      },
    },
    select: { id: true },
  });
  return { freeUserId: free.id, proUserId: pro.id };
}

export async function resetTestDatabase(
  prisma: PrismaClient,
): Promise<TestUsers> {
  await truncateAllTables(prisma);
  await prisma.itemType.createMany({
    data: systemItemTypes.map((type) => ({ ...type, isSystem: true })),
  });
  return createTestUsers(prisma);
}
