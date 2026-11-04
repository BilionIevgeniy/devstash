import "client-only";

import type { SearchIndex, SearchIndexJson } from "@/features/search/types";
import type { ActionResult } from "@/lib/action-result";

// The browser side of GET /api/search: null is a failure (signed out, a server
// error). The items go to the drawer, which takes a real Date.
export async function fetchSearchIndex(
  signal: AbortSignal,
): Promise<SearchIndex | null> {
  const response = await fetch("/api/search", { signal });
  if (!response.ok) return null;

  const { data } =
    (await response.json()) as ActionResult<SearchIndexJson | null>;
  if (!data) return null;

  return {
    collections: data.collections,
    items: data.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    })),
  };
}
