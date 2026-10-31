import type { ActionResult } from "@/lib/action-result";
import type { ItemDetailJson } from "@/features/items/types";

// The browser side of GET /api/items/[id]: null for any answer that is not a
// detail (signed out, missing, someone else's, a server error).
export async function fetchItemDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ItemDetailJson | null> {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, {
    signal,
  });
  if (!response.ok) return null;
  const body = (await response.json()) as ActionResult<ItemDetailJson | null>;
  return body.data;
}
