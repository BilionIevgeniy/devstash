import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { requireTestDatabase } from "./require-dev-database";
import { resetTestDatabase } from "./test-database";

// Empties the test database and seeds it: the system item types, a Free and a
// Pro user. Reads TEST_DATABASE_URL (locally from .env.test), never
// DATABASE_URL, so it cannot reach the database of .env.
config({ path: ".env.test", quiet: true });

const connectionString = requireTestDatabase(process.env.TEST_DATABASE_URL);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await resetTestDatabase(prisma);
  const [types, users] = await Promise.all([
    prisma.itemType.count(),
    prisma.user.count(),
  ]);
  console.log(`Test database seeded: ${types} item types, ${users} users`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
