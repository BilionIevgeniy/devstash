import "server-only";

import {
  dashboardItemSelect,
  toDashboardItem,
} from "@/features/items/_internal/queries";
import {
  favoriteKeyset,
  pinnedKeyset,
} from "@/features/items/_internal/queries/list-keyset";
import {
  compareNames,
  type FavoriteItemSort,
} from "@/features/items/domain/favorite-sort";
import { encodeListCursor } from "@/features/items/domain/list-cursor";
import {
  FAVORITES_PAGE_SIZE,
  favoriteCursorValues,
  PINNED_GROUP_PAGE_SIZE,
  pinnedCursorValues,
  splitPage,
} from "@/features/items/domain/list-pages";
import type { PinnedItemSort } from "@/features/items/domain/pinned-items";
import type {
  DashboardItem,
  FavoriteItem,
  FirstListPage,
  ItemListPage,
  PinnedGroupPage,
} from "@/features/items/types";
import { prisma } from "@/lib/prisma";

// The endless lists of /favorites and /pinned (ADR 0025): one page at a time,
// read with one row more than the page holds to know whether more exist. The
// first page comes from the page itself, the next ones from the routes under
// app/api/items/; `after` is the decoded cursor (items/schemas.ts).

const favoriteSelect = { ...dashboardItemSelect, favoritedAt: true } as const;

function toFavoriteItem({
  favoritedAt,
  ...item
}: { favoritedAt: Date | null } & Parameters<
  typeof toDashboardItem
>[0]): FavoriteItem {
  // A database check (migration favorited_at_required) keeps a favorite's date.
  if (!favoritedAt) throw new Error("A favorite has no favoritedAt");
  return { ...toDashboardItem(item), favoritedAt };
}

export async function getFavoriteItemPage(
  userId: string,
  sort: FavoriteItemSort,
  after: string[] | null,
): Promise<ItemListPage<FavoriteItem>> {
  const { orderBy, where } = favoriteKeyset(sort, after);
  const read = await prisma.item.findMany({
    where: { AND: [{ userId, isFavorite: true }, where] },
    orderBy,
    take: FAVORITES_PAGE_SIZE + 1,
    select: favoriteSelect,
  });
  const { rows, hasMore } = splitPage(
    read.map(toFavoriteItem),
    FAVORITES_PAGE_SIZE,
  );
  const last = rows.at(-1);
  return {
    rows,
    nextCursor:
      hasMore && last
        ? encodeListCursor(sort, favoriteCursorValues(last, sort))
        : null,
  };
}

// The first page a page renders, stamped with the time of the read.
export async function getFavoriteFirstPage(
  userId: string,
  sort: FavoriteItemSort,
): Promise<FirstListPage<FavoriteItem>> {
  const page = await getFavoriteItemPage(userId, sort, null);
  return { sort, page, renderedAt: Date.now() };
}

export function countFavoriteItems(userId: string): Promise<number> {
  return prisma.item.count({ where: { userId, isFavorite: true } });
}

export async function getPinnedGroupPage(
  userId: string,
  typeId: string,
  sort: PinnedItemSort,
  after: string[] | null,
): Promise<ItemListPage> {
  const { orderBy, where } = pinnedKeyset(sort, after);
  const read = await prisma.item.findMany({
    where: { AND: [{ userId, typeId, isPinned: true }, where] },
    orderBy,
    take: PINNED_GROUP_PAGE_SIZE + 1,
    select: dashboardItemSelect,
  });
  const { rows, hasMore } = splitPage(
    read.map(toDashboardItem),
    PINNED_GROUP_PAGE_SIZE,
  );
  const last: DashboardItem | undefined = rows.at(-1);
  return {
    rows,
    nextCursor:
      hasMore && last
        ? encodeListCursor(sort, pinnedCursorValues(last, sort))
        : null,
  };
}

// Every type with pins, by name, each with its count and its first page. One
// read per type (the system types are seven); custom types would make this
// grow (context/todo.md).
export async function getPinnedFirstPages(
  userId: string,
  sort: PinnedItemSort,
): Promise<PinnedGroupPage[]> {
  const counts = await prisma.item.groupBy({
    by: ["typeId"],
    where: { userId, isPinned: true },
    _count: { _all: true },
  });
  const groups = await Promise.all(
    counts.map(async ({ typeId, _count }) => ({
      count: _count._all,
      page: await getPinnedGroupPage(userId, typeId, sort, null),
    })),
  );
  const renderedAt = Date.now();
  // A type whose last pin went between the two reads has no row to name it.
  return groups
    .flatMap(({ count, page }) => {
      const first = page.rows.at(0);
      return first
        ? [{ type: first.type, count, first: { sort, page, renderedAt } }]
        : [];
    })
    .toSorted((a, b) => compareNames(a.type.name, b.type.name));
}
