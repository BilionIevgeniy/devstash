import { useQuery } from "@tanstack/react-query";

import { fetchCollectionOptions } from "@/features/items/_internal/components/fetch-collection-options";
import { itemKeys } from "@/features/items/components/item-queries";
import type { ItemCollectionRef } from "@/features/items/types";

export type CollectionOptionsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; collections: ItemCollectionRef[] };

// Read each time a form mounts, as before the cache (ADR 0025): the forms sit
// in the shell's dialogs, which outlive a change of user in another tab, so
// options cached before this mount are never shown; the form waits for its own
// answer. Unmounting cancels the request, and a cancel is not a failure.
export function useCollectionOptions(): CollectionOptionsState {
  const query = useQuery({
    queryKey: itemKeys.collectionOptions(),
    queryFn: ({ signal }) => fetchCollectionOptions(signal),
    refetchOnMount: "always",
  });

  if (!query.isFetchedAfterMount || query.isFetching) {
    return { status: "loading" };
  }
  if (query.isError || !query.data) return { status: "error" };
  return { status: "ready", collections: query.data };
}
