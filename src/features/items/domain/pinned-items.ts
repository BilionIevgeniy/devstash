import { compareNames } from "@/features/items/domain/favorite-sort";
import {
  groupItemsByType,
  type TypeGroup,
} from "@/features/items/domain/group-by-type";
import type { DashboardItem } from "@/features/items/types";

export const PINNED_ITEM_SORTS = ["newest", "oldest", "a-z", "z-a"] as const;

export type PinnedItemSort = (typeof PINNED_ITEM_SORTS)[number];

function compareItems(
  a: DashboardItem,
  b: DashboardItem,
  sort: PinnedItemSort,
): number {
  switch (sort) {
    case "newest":
      return b.createdAt.getTime() - a.createdAt.getTime();
    case "oldest":
      return a.createdAt.getTime() - b.createdAt.getTime();
    case "a-z":
      return compareNames(a.title, b.title);
    case "z-a":
      return compareNames(b.title, a.title);
  }
}

// An item has no pin date, so the dates are the creation dates. Ties keep the
// server's order.
export function sortPinnedItems<T extends DashboardItem>(
  items: T[],
  sort: PinnedItemSort,
): T[] {
  return items.toSorted((a, b) => compareItems(a, b, sort));
}

// Types go by name, not by how many items they hold: removing one pin must not
// make a whole group jump.
export function groupPinnedItems<T extends DashboardItem>(
  items: T[],
): TypeGroup<T>[] {
  return groupItemsByType(items).toSorted((a, b) =>
    compareNames(a.type.name, b.type.name),
  );
}
