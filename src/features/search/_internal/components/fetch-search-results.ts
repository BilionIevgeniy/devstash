import "client-only";

import type {
  PaletteResults,
  PaletteResultsJson,
} from "@/features/search/types";
import type { ActionResult } from "@/lib/action-result";

export type SearchOutcome =
  | { status: "ready"; results: PaletteResults }
  | { status: "error" }
  | { status: "rate-limited" };

// The browser side of GET /api/search. An empty query asks for the recent
// list. A failed answer is an outcome; a network failure or an abort throws.
// The items go to the drawer, which takes a real Date.
export async function fetchSearchResults(
  query: string,
  cursor: string | null,
  signal: AbortSignal,
): Promise<SearchOutcome> {
  const params = new URLSearchParams();
  if (query !== "") params.set("q", query);
  if (cursor !== null) params.set("cursor", cursor);

  const response = await fetch(`/api/search?${params}`, { signal });
  if (response.status === 429) return { status: "rate-limited" };
  if (!response.ok) return { status: "error" };

  const { data } =
    (await response.json()) as ActionResult<PaletteResultsJson | null>;
  if (!data) return { status: "error" };

  return {
    status: "ready",
    results: {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      })),
    },
  };
}
