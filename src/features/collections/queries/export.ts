import "server-only";

import type { ExportedCollection } from "@/features/collections/types";
import { prisma } from "@/lib/prisma";

// Every collection of the caller for the export, in one read: a row is small,
// so the collections are not paged like the items.
export function getExportCollections(
  userId: string,
): Promise<ExportedCollection[]> {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { id: "asc" },
    select: { id: true, name: true, description: true, createdAt: true },
  });
}
