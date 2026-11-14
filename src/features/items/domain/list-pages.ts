import type { CursorKind } from "@/features/items/domain/list-cursor";
import type { FavoriteItemSort } from "@/features/items/domain/favorite-sort";
import type { PinnedItemSort } from "@/features/items/domain/pinned-items";
import type { DashboardItem, FavoriteItem } from "@/features/items/types";

// The endless lists of /favorites and /pinned (ADR 0025): how many rows a page
// holds and what its cursor carries for each sort. Every cursor ends with the
// id, so the order is total and a page boundary never splits equal values.

export const FAVORITES_PAGE_SIZE = 30;

// /pinned shows every type as a group; each starts with this many rows and
// shows more on request.
export const PINNED_GROUP_PAGE_SIZE = 10;

export const FAVORITE_CURSOR_KINDS: Record<FavoriteItemSort, CursorKind[]> = {
  newest: ["date", "text"],
  oldest: ["date", "text"],
  "a-z": ["text", "text"],
  "z-a": ["text", "text"],
  // Type name, type id (two types may share a name), title, id.
  type: ["text", "text", "text", "text"],
};

export const PINNED_CURSOR_KINDS: Record<PinnedItemSort, CursorKind[]> = {
  newest: ["date", "text"],
  oldest: ["date", "text"],
  "a-z": ["text", "text"],
  "z-a": ["text", "text"],
};

export function favoriteCursorValues(
  row: FavoriteItem,
  sort: FavoriteItemSort,
): string[] {
  switch (sort) {
    case "newest":
    case "oldest":
      return [row.favoritedAt.toISOString(), row.id];
    case "a-z":
    case "z-a":
      return [row.title, row.id];
    case "type":
      return [row.type.name, row.type.id, row.title, row.id];
  }
}

export function pinnedCursorValues(
  row: DashboardItem,
  sort: PinnedItemSort,
): string[] {
  switch (sort) {
    case "newest":
    case "oldest":
      return [row.createdAt.toISOString(), row.id];
    case "a-z":
    case "z-a":
      return [row.title, row.id];
  }
}

/**
 * The rows of a page read with one row more than it shows, and whether there is
 * a next page: the extra row only says so and is left out.
 */
export function splitPage<T>(
  rows: T[],
  size: number,
): { rows: T[]; hasMore: boolean } {
  return rows.length > size
    ? { rows: rows.slice(0, size), hasMore: true }
    : { rows, hasMore: false };
}
