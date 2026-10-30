import type { ItemDetail, ItemDetailJson } from "@/features/items/types";

// The dates go out as ISO strings, the shape GET /api/items/[id] answers with,
// so the drawer keeps one type for its detail.
export function toItemDetailJson({
  createdAt,
  updatedAt,
  ...item
}: ItemDetail): ItemDetailJson {
  return {
    ...item,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}
