import "client-only";

import type { QueryClient } from "@tanstack/react-query";

import { itemKeys } from "@/features/items/components/item-queries";
import type { OpenedItemJson } from "@/features/items/types";
import { readRouteData } from "@/lib/route-error";

// How long a detail read for the drawer or a copy is reused without asking
// again (ADR 0025). Short: an edit made elsewhere shows within a minute.
export const ITEM_DETAIL_STALE_MS = 60 * 1000;

// The browser side of GET /api/items/[id]. Any answer that is not a detail
// (signed out, missing, someone else's, locked, a server error) is thrown as
// a RouteError, so the Query retry rule can tell a refusal from a failure.
export async function fetchItemDetail(
  id: string,
  signal?: AbortSignal,
): Promise<OpenedItemJson> {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, {
    signal,
  });
  return readRouteData<OpenedItemJson>(response);
}

export function itemDetailQuery(id: string) {
  return {
    queryKey: itemKeys.detail(id),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchItemDetail(id, signal),
    staleTime: ITEM_DETAIL_STALE_MS,
  };
}

// The detail from the cache when it is fresh enough, else from the route; the
// copy button and the drawer share it, so a copy then an open fetches once.
export function readItemDetail(
  queryClient: QueryClient,
  id: string,
): Promise<OpenedItemJson> {
  return queryClient.query(itemDetailQuery(id));
}
