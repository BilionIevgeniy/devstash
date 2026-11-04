import "client-only";

import type { ItemCollectionRef } from "@/features/items/types";
import type { ActionResult } from "@/lib/action-result";

// The browser side of GET /api/collections: null is a failure (signed out, a
// server error), and an empty list is a user with no collections.
export async function fetchCollectionOptions(
  signal: AbortSignal,
): Promise<ItemCollectionRef[] | null> {
  const response = await fetch("/api/collections", { signal });
  if (!response.ok) return null;
  const body = (await response.json()) as ActionResult<
    ItemCollectionRef[] | null
  >;
  return body.data;
}
