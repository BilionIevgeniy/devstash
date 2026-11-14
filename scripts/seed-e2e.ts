import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  E2E_LIST_ROWS,
  E2E_USER_PASSWORD,
  listsUserEmail,
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
    console.log("End-to-end database ready");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
