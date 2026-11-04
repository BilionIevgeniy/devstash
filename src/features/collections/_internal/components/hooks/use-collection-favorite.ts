import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { setCollectionFavorite } from "@/features/collections/actions/collection";

const FAVORITE_FAILED_MESSAGE = "Couldn't update the favorite.";

export interface CollectionFavorite {
  isFavorite: boolean;
  isPending: boolean;
  toggle: () => void;
}

// The star of one collection. The value shows while the transition runs: on
// success the action's refresh brings the fresh page before it ends; on failure
// the star falls back. A click during a running save is ignored, so it cannot
// be sent twice.
export function useCollectionFavorite(
  collectionId: string,
  isFavorite: boolean,
): CollectionFavorite {
  const [current, setCurrent] = useOptimistic(isFavorite);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    if (isPending) return;

    startTransition(async () => {
      setCurrent(!current);
      try {
        const result = await setCollectionFavorite(collectionId, !current);
        if (!result.success) {
          toast.error(result.error ?? FAVORITE_FAILED_MESSAGE);
        }
      } catch {
        toast.error(FAVORITE_FAILED_MESSAGE);
      }
    });
  }

  return { isFavorite: current, isPending, toggle };
}
