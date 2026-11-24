import "server-only";

import {
  dashboardItemSelect,
  toDashboardItem,
} from "@/features/items/_internal/queries/selects";
import {
  favoriteKeyset,
  pinnedKeyset,
} from "@/features/items/_internal/queries/list-keyset";
import {
  getPinnedRankedRows,
  type PinnedRankedRow,
} from "@/features/items/_internal/queries/pinned-first-pages";
import type { FavoriteItemSort } from "@/features/items/domain/list/favorite-sort";
import { encodeListCursor } from "@/features/items/domain/list/list-cursor";
import {
  FAVORITES_PAGE_SIZE,
  favoriteCursorValues,
  PINNED_GROUP_PAGE_SIZE,
  pinnedCursorValues,
  splitPage,
} from "@/features/items/domain/list/list-pages";
import type { PinnedItemSort } from "@/features/items/domain/list/pinned-items";
import type {
  DashboardItem,
  FavoriteItem,
  FirstListPage,
  ItemListPage,
  PinnedGroupPage,
} from "@/features/items/types";
import { prisma } from "@/lib/postgres/prisma";
import { compareNames } from "@/lib/utils";

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

// Every type with pins, by name, each with its count and its first page: one
// ranked read for all types (pinned-first-pages.ts) and one read of those
// rows, whatever the number of types. Whether a type has more and its count
// come from the ranked read, not from the rows found: a pin removed between
// the two reads only shortens its page.
export async function getPinnedFirstPages(
  userId: string,
  sort: PinnedItemSort,
): Promise<PinnedGroupPage[]> {
  const ranked = await getPinnedRankedRows(userId, sort);
  const found = await prisma.item.findMany({
    where: { userId, id: { in: ranked.map((row) => row.id) } },
    select: dashboardItemSelect,
  });
  const byId = new Map(found.map((item) => [item.id, toDashboardItem(item)]));
  const renderedAt = Date.now();
  return groupByType(ranked)
    .flatMap(({ count, ids }) => {
      const { rows: pageIds, hasMore } = splitPage(ids, PINNED_GROUP_PAGE_SIZE);
      const rows = pageIds.flatMap((id) => byId.get(id) ?? []);
      const first = rows.at(0);
      const last = rows.at(-1);
      // A type whose pins all went between the two reads has no row to name it.
      if (!first || !last) return [];
      const nextCursor = hasMore
        ? encodeListCursor(sort, pinnedCursorValues(last, sort))
        : null;
      const page = { rows, nextCursor };
      return [{ type: first.type, count, first: { sort, page, renderedAt } }];
    })
    .toSorted((a, b) => compareNames(a.type.name, b.type.name));
}

// The ranked rows come ordered by type, then by position.
function groupByType(
  ranked: PinnedRankedRow[],
): { count: number; ids: string[] }[] {
  const groups = new Map<string, { count: number; ids: string[] }>();
  for (const row of ranked) {
    const group = groups.get(row.typeId) ?? { count: row.count, ids: [] };
    group.ids.push(row.id);
    groups.set(row.typeId, group);
  }
  return [...groups.values()];
}
