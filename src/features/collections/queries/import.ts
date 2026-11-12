import "server-only";

import { prisma } from "@/lib/prisma";

// The caller's collection for each of these names. Names are not unique, so
// the oldest one wins, the same one on every run.
export async function getCollectionIdsByName(
  userId: string,
  names: string[],
): Promise<Map<string, string>> {
  if (names.length === 0) return new Map();
  const rows = await prisma.collection.findMany({
    where: { userId, name: { in: names } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
  const ids = new Map<string, string>();
  for (const { id, name } of rows) {
    if (!ids.has(name)) ids.set(name, id);
  }
  return ids;
}
