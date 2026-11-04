import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// A connection from a developer's machine to the database takes most of a
// second, and pg closes an idle one after 10 seconds, so nearly every page in
// `next dev` would pay for a new one. Under the 5 minutes after which Neon
// suspends. Development only: on Vercel a suspended instance stops the pool's
// timers, so a long timeout can leave stale sockets.
const DEV_IDLE_TIMEOUT_MS = 4 * 60 * 1000;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({
    connectionString,
    ...(process.env.NODE_ENV === "development" && {
      idleTimeoutMillis: DEV_IDLE_TIMEOUT_MS,
    }),
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
