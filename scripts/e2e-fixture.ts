import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashTestPassword, makePro, writeSnippets } from "./e2e-rows";
import { requireE2eUserEmail } from "./e2e-user";
import { requireTestDatabase } from "./require-dev-database";
import { createVerifiedTestUser } from "./test-database";

// A fresh user for one end-to-end test, for the journeys that change their
// user for good (the Free limit, a password change) or need data no other
// test touches (ADR 0035): a retry or --repeat-each gets a new one. Run from a
// test through e2e/support/fresh-user.ts, in a child process under tsx, where
// the generated Prisma client loads as it does for the seed. Prints the email.
// Reads TEST_DATABASE_URL (locally from .env.test), never DATABASE_URL.
config({ path: ".env.test", quiet: true });

// One below the Free item limit, so the next create is the last one allowed.
export const E2E_NEAR_LIMIT_ROWS = 49;

export const FRESH_USER_KINDS = ["free", "near-limit", "pro"] as const;
export type FreshUserKind = (typeof FRESH_USER_KINDS)[number];

function isKind(value: string | undefined): value is FreshUserKind {
  return FRESH_USER_KINDS.some((kind) => kind === value);
}

async function main() {
  const kind = process.argv[2];
  if (!isKind(kind)) {
    throw new Error(`Usage: e2e-fixture.ts <${FRESH_USER_KINDS.join("|")}>`);
  }
  const connectionString = requireTestDatabase(process.env.TEST_DATABASE_URL);
  // Derived from the run's email, so it is new every run and the per-email
  // counters in Upstash never carry over.
  const email = `${kind}-${randomUUID().slice(0, 8)}-${requireE2eUserEmail()}`;

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const userId = await createVerifiedTestUser(prisma, {
      email,
      passwordHash: await hashTestPassword(),
    });
    if (kind === "near-limit") {
      await writeSnippets(prisma, userId, E2E_NEAR_LIMIT_ROWS, "Seeded item");
    }
    if (kind === "pro") await makePro(prisma, userId);
    process.stdout.write(email);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("e2e-fixture.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
