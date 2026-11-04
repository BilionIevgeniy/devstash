import { rankTypesByUsage } from "@/features/item-types/domain/rank-types-by-usage";
import type { ItemTypeInfo } from "@/features/item-types/types";

export interface TypeGroup<T> {
  type: ItemTypeInfo;
  items: T[];
}

// The type with the most items comes first; inside a group the items keep the
// order they came in.
export function groupItemsByType<T extends { type: ItemTypeInfo }>(
  items: T[],
): TypeGroup<T>[] {
  const typesById = new Map(items.map(({ type }) => [type.id, type]));
  const ranked = rankTypesByUsage(
    items.map(({ type }) => type.id),
    typesById,
  );

  return ranked.map((type) => ({
    type,
    items: items.filter((item) => item.type.id === type.id),
  }));
}
