import type { ItemTypeInfo } from "@/features/item-types/types";

export function rankTypesByUsage(
  typeIds: string[],
  typesById: Map<string, ItemTypeInfo>,
): ItemTypeInfo[] {
  const counts = new Map<string, number>();
  for (const id of typeIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const ranked: { type: ItemTypeInfo; count: number }[] = [];
  for (const [id, count] of counts) {
    const type = typesById.get(id);
    if (type) {
      ranked.push({ type, count });
    }
  }

  return ranked
    .sort((a, b) => b.count - a.count || a.type.name.localeCompare(b.type.name))
    .map(({ type }) => type);
}
