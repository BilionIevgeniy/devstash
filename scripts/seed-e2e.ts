import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { E2E_USER_PASSWORD, requireE2eUserEmail } from "./e2e-user";
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

async function main() {
  const connectionString = requireTestDatabase(process.env.TEST_DATABASE_URL);
  const email = requireE2eUserEmail();

  migrateTestDatabase(connectionString);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await resetTestDatabase(prisma);
    await createVerifiedTestUser(prisma, {
      email,
      passwordHash: await bcrypt.hash(E2E_USER_PASSWORD, TEST_BCRYPT_ROUNDS),
    });
    console.log("End-to-end database ready");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
