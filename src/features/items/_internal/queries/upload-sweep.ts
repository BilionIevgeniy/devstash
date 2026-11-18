import "server-only";

import { prisma } from "@/lib/postgres/prisma";

// Which of the given R2 keys an item holds. Not scoped by a user: the daily
// sweep of unclaimed uploads looks at every user's objects at once, and only
// the keys it passes in are read (ADR 0030). It returns object keys, so it
// stays in `_internal` (ADR 0010).
export async function getHeldFileKeys(keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const items = await prisma.item.findMany({
    where: { fileKey: { in: keys } },
    select: { fileKey: true },
  });
  return new Set(items.flatMap(({ fileKey }) => (fileKey ? [fileKey] : [])));
}
