import "server-only";

import { NEWEST_FIRST } from "@/features/items/_internal/queries/selects";
import type { LockedFileRecord } from "@/features/items/types";
import type { Prisma } from "@/generated/prisma/client";
import { CARDS_PER_PAGE, type Paginated, readPage } from "@/lib/pagination";
import { prisma } from "@/lib/postgres/prisma";

function fileItemsOf(userId: string) {
  return { userId, fileKey: { not: null } } satisfies Prisma.ItemWhereInput;
}

export function countFileItems(userId: string): Promise<number> {
  return prisma.item.count({ where: fileItemsOf(userId) });
}

// Every item with an upload, newest first, read only by the locked files service.
export function getFileItemRecords(
  userId: string,
  page: number,
): Promise<Paginated<LockedFileRecord>> {
  return readPage(
    page,
    CARDS_PER_PAGE,
    () => countFileItems(userId),
    (skip, take) =>
      prisma.item.findMany({
        where: fileItemsOf(userId),
        orderBy: NEWEST_FIRST,
        skip,
        take,
        select: {
          id: true,
          title: true,
          fileKey: true,
          fileName: true,
          fileSize: true,
        },
      }),
  );
}
