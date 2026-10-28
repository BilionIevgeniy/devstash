import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_USER_EMAIL } from "../prisma/demo-user";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const databaseHost = new URL(connectionString).hostname;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  console.log(`Database host: ${databaseHost}`);

  const users = await prisma.user.findMany({
    where: { email: { not: DEMO_USER_EMAIL } },
    select: { email: true },
    orderBy: { email: "asc" },
  });
  if (users.length === 0) {
    console.log(`No users to delete (only ${DEMO_USER_EMAIL} is kept)`);
  }
  for (const { email } of users) {
    console.log(`Deleting ${email}`);
  }

  const [deletedUsers, deletedTokens] = await prisma.$transaction([
    prisma.user.deleteMany({ where: { email: { not: DEMO_USER_EMAIL } } }),
    prisma.verificationToken.deleteMany({
      where: { identifier: { not: DEMO_USER_EMAIL } },
    }),
  ]);

  console.log(
    `Deleted ${deletedUsers.count} user(s) and ${deletedTokens.count} verification token(s); kept ${DEMO_USER_EMAIL}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
