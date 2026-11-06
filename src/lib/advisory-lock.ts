import "server-only";

import type { Prisma } from "@/generated/prisma/client";

// For a transaction that takes the lock: waiting for it counts against the
// timeout, and Prisma's defaults (2s and 5s) are short for that and for a Neon
// compute waking up.
export const LOCKED_TRANSACTION = { maxWait: 10_000, timeout: 15_000 };

// Held until the transaction ends, and safe through a transaction-mode pooler.
// $executeRaw and not $queryRaw: the function returns void.
export async function lockForTransaction(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
