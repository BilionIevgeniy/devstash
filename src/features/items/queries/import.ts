import "server-only";

import type { ItemIdentity } from "@/features/items/types";
import { prisma } from "@/lib/prisma";

// The caller's items with one of these titles, as an import compares them to
// decide what is already there.
export async function getItemIdentities(
  userId: string,
  titles: string[],
): Promise<ItemIdentity[]> {
  if (titles.length === 0) return [];
  const items = await prisma.item.findMany({
    where: { userId, title: { in: titles } },
    select: {
      title: true,
      content: true,
      url: true,
      type: { select: { name: true } },
    },
  });
  return items.map(({ type, ...item }) => ({ ...item, typeName: type.name }));
}
