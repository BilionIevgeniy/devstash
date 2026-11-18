import "server-only";

import { prisma } from "@/lib/postgres/prisma";

// The daily job's part for tokens (app/api/cron/daily). A token is single-use
// and dies at `expires`, but an unused one stayed until a new link replaced it
// or the account was deleted. One statement: the table holds a few rows per
// active address. Running it twice deletes nothing more.
export async function deleteExpiredTokens(
  now: Date,
): Promise<{ deleted: number }> {
  const { count } = await prisma.verificationToken.deleteMany({
    where: { expires: { lt: now } },
  });
  return { deleted: count };
}
