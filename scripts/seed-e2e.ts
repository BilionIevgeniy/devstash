import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  E2E_KEPT_TYPE,
  E2E_LIST_ROWS,
  E2E_OVER_LIMIT_ROWS,
  E2E_USER_PASSWORD,
  listsUserEmail,
  overLimitUserEmail,
  proUserEmail,
  requireE2eUserEmail,
} from "./e2e-user";
import { migrateTestDatabase } from "./migrate-test-database";
import { requireTestDatabase } from "./require-dev-database";
import { createVerifiedTestUser, resetTestDatabase } from "./test-database";

// Prepares the database of the end-to-end tests: brings it to the schema of
// this branch, empties it, seeds the system item types and the two test users,
// and adds the user of this run (verified, with a password) who signs in
// through the form. The global setup of Playwright runs it in a child process,
// so the generated Prisma client loads the way it does for `db:seed-test`.
// Reads TEST_DATABASE_URL (locally from .env.test), never DATABASE_URL, so it
// cannot reach the database of .env.
config({ path: ".env.test", quiet: true });

// Low cost on purpose: only the tests read this hash.
const TEST_BCRYPT_ROUNDS = 4;

const PRO_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

// The user of the endless lists: snippets "List item 01" to "40", each starred
// and pinned, starred a minute apart (so Newest is 40 first and A-Z 01 first).
// Written directly: the spec only reads them, so --repeat-each needs no more,
// and the Free item limit does not apply to rows that never went through it.
async function seedListsUser(
  prisma: PrismaClient,
  email: string,
  passwordHash: string,
): Promise<void> {
  await createVerifiedTestUser(prisma, { email, passwordHash });
  const [user, snippet] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } }),
    prisma.itemType.findFirstOrThrow({
      where: { name: "snippet", isSystem: true },
      select: { id: true },
    }),
  ]);
  const start = Date.UTC(2026, 0, 1);
  await prisma.item.createMany({
    data: Array.from({ length: E2E_LIST_ROWS }, (_, i) => ({
      userId: user.id,
      typeId: snippet.id,
      contentType: "TEXT",
      title: `List item ${String(i + 1).padStart(2, "0")}`,
      content: `echo ${i + 1}`,
      isFavorite: true,
      favoritedAt: new Date(start + i * 60_000),
      isPinned: true,
      createdAt: new Date(start + i * 60_000),
    })),
  });
}

// The Pro user of the AI journey: an active subscription row, as the Stripe
// sync writes one, so getEntitlements gives Pro.
async function seedProUser(
  prisma: PrismaClient,
  email: string,
  passwordHash: string,
): Promise<void> {
  await createVerifiedTestUser(prisma, { email, passwordHash });
  await prisma.subscription.create({
    data: {
      user: { connect: { email } },
      status: "active",
      stripeCustomerId: "cus_e2e_pro",
      stripeSubscriptionId: "sub_e2e_pro",
      currentPeriodEnd: new Date(Date.now() + PRO_PERIOD_MS),
    },
  });
}

// The former Pro user of the downgrade journey: a cancelled subscription, more
// items than the Free plan allows and a custom type kept from Pro (ADR 0032).
// Written directly, past the limit, as an account that grew on Pro would be.
async function seedOverLimitUser(
  prisma: PrismaClient,
  email: string,
  passwordHash: string,
): Promise<void> {
  await createVerifiedTestUser(prisma, { email, passwordHash });
  const [user, snippet] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } }),
    prisma.itemType.findFirstOrThrow({
      where: { name: "snippet", isSystem: true },
      select: { id: true },
    }),
  ]);
  await prisma.subscription.create({
    data: { userId: user.id, status: "canceled" },
  });
  await prisma.itemType.create({
    data: {
      userId: user.id,
      name: E2E_KEPT_TYPE,
      slug: E2E_KEPT_TYPE.toLowerCase(),
      icon: "Code",
    },
  });
  await prisma.item.createMany({
    data: Array.from({ length: E2E_OVER_LIMIT_ROWS }, (_, i) => ({
      userId: user.id,
      typeId: snippet.id,
      contentType: "TEXT",
      title: `Kept item ${String(i + 1).padStart(2, "0")}`,
      content: `echo ${i + 1}`,
    })),
  });
}

async function main() {
  const connectionString = requireTestDatabase(process.env.TEST_DATABASE_URL);
  const email = requireE2eUserEmail();

  migrateTestDatabase(connectionString);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await resetTestDatabase(prisma);
    const passwordHash = await bcrypt.hash(
      E2E_USER_PASSWORD,
      TEST_BCRYPT_ROUNDS,
    );
    await createVerifiedTestUser(prisma, { email, passwordHash });
    await seedListsUser(prisma, listsUserEmail(email), passwordHash);
    await seedProUser(prisma, proUserEmail(email), passwordHash);
    await seedOverLimitUser(prisma, overLimitUserEmail(email), passwordHash);
    console.log("End-to-end database ready");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
