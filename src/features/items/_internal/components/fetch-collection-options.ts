import "client-only";

import type { ItemCollectionRef } from "@/features/items/types";
import { readRouteData } from "@/lib/route-error";

// The browser side of GET /api/collections. A failure (signed out, a server
// error) is thrown as a RouteError for the Query retry rule; an empty list is
// a user with no collections.
export async function fetchCollectionOptions(
  signal: AbortSignal,
): Promise<ItemCollectionRef[]> {
  const response = await fetch("/api/collections", { signal });
  return readRouteData<ItemCollectionRef[]>(response);
}
