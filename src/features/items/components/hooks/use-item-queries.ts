import { useQueryClient } from "@tanstack/react-query";

import {
  syncItemQueries,
  type ItemChange,
} from "@/features/items/components/item-queries";

// `syncItemQueries` bound to the provider's client, for the client code that
// calls an action of items, collections or import-export (ADR 0025; a guard
// test lists them).
export function useSyncItemQueries(): (change: ItemChange) => Promise<void> {
  const queryClient = useQueryClient();
  return (change) => syncItemQueries(queryClient, change);
}
