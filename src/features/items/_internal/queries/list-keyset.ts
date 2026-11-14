import "server-only";

import type { FavoriteItemSort } from "@/features/items/domain/favorite-sort";
import type { PinnedItemSort } from "@/features/items/domain/pinned-items";
import type { Prisma } from "@/generated/prisma/client";

// The order and the "after this row" condition of the endless lists (ADR
// 0017, ADR 0025). Both run in Postgres, so the comparison of a cursor value
// uses the same collation as the ORDER BY ("und-x-icu" on Item.title) and a
// page boundary never skips or repeats a row.

type Direction = "asc" | "desc";

interface SortKey {
  direction: Direction;
  orderBy: Prisma.ItemOrderByWithRelationInput;
  /** The rows after `value` in this key's direction. */
  after: (value: string) => Prisma.ItemWhereInput;
  equals: (value: string) => Prisma.ItemWhereInput;
}

function op(direction: Direction): "gt" | "lt" {
  return direction === "asc" ? "gt" : "lt";
}

function dateKey(
  field: "favoritedAt" | "createdAt",
  direction: Direction,
): SortKey {
  return {
    direction,
    orderBy: { [field]: direction },
    after: (value) => ({ [field]: { [op(direction)]: new Date(value) } }),
    equals: (value) => ({ [field]: new Date(value) }),
  };
}

function textKey(
  field: "title" | "typeId" | "id",
  direction: Direction,
): SortKey {
  return {
    direction,
    orderBy: { [field]: direction },
    after: (value) => ({ [field]: { [op(direction)]: value } }),
    equals: (value) => ({ [field]: value }),
  };
}

const TYPE_NAME: SortKey = {
  direction: "asc",
  orderBy: { type: { name: "asc" } },
  after: (value) => ({ type: { is: { name: { gt: value } } } }),
  equals: (value) => ({ type: { is: { name: value } } }),
};

const FAVORITE_KEYS: Record<FavoriteItemSort, SortKey[]> = {
  newest: [dateKey("favoritedAt", "desc"), textKey("id", "desc")],
  oldest: [dateKey("favoritedAt", "asc"), textKey("id", "asc")],
  "a-z": [textKey("title", "asc"), textKey("id", "asc")],
  "z-a": [textKey("title", "desc"), textKey("id", "desc")],
  type: [
    TYPE_NAME,
    textKey("typeId", "asc"),
    textKey("title", "asc"),
    textKey("id", "asc"),
  ],
};

const PINNED_KEYS: Record<PinnedItemSort, SortKey[]> = {
  newest: [dateKey("createdAt", "desc"), textKey("id", "desc")],
  oldest: [dateKey("createdAt", "asc"), textKey("id", "asc")],
  "a-z": [textKey("title", "asc"), textKey("id", "asc")],
  "z-a": [textKey("title", "desc"), textKey("id", "desc")],
};

// (k1 > v1) OR (k1 = v1 AND k2 > v2) OR …, each key in its own direction.
function afterValues(keys: SortKey[], values: string[]): Prisma.ItemWhereInput {
  return {
    OR: keys.map((key, index) => ({
      AND: [
        ...keys.slice(0, index).map((prior, j) => prior.equals(values[j])),
        key.after(values[index]),
      ],
    })),
  };
}

export interface Keyset {
  orderBy: Prisma.ItemOrderByWithRelationInput[];
  /** Empty for the first page. */
  where: Prisma.ItemWhereInput;
}

function keyset(keys: SortKey[], after: string[] | null): Keyset {
  return {
    orderBy: keys.map((key) => key.orderBy),
    where: after ? afterValues(keys, after) : {},
  };
}

export function favoriteKeyset(
  sort: FavoriteItemSort,
  after: string[] | null,
): Keyset {
  return keyset(FAVORITE_KEYS[sort], after);
}

export function pinnedKeyset(
  sort: PinnedItemSort,
  after: string[] | null,
): Keyset {
  return keyset(PINNED_KEYS[sort], after);
}
