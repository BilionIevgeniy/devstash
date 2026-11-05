import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { setCollectionFavorite } from "@/features/collections/actions/collection";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";

const FAVORITE_FAILED_MESSAGE = "Couldn't update the favorite.";
const UNFAVORITED_MESSAGE = "Removed from favorites";

export interface CollectionFavorite {
  isFavorite: boolean;
  isPending: boolean;
  toggle: () => void;
}

interface FavoriteOptions {
  /** Taking the star off removes the row from its list, so the toast offers Undo. */
  undoable?: boolean;
}

// Calls the action directly: the row that offered Undo is gone by then.
async function restoreFavorite(collectionId: string) {
  try {
    const result = await setCollectionFavorite(collectionId, true);
    if (!result.success) {
      toast.error(result.error ?? FAVORITE_FAILED_MESSAGE);
    }
  } catch {
    toast.error(FAVORITE_FAILED_MESSAGE);
  }
}

// The star of one collection. The value shows while the transition runs: on
// success the action's refresh brings the fresh page before it ends; on failure
// the star falls back. A click during a running save is ignored, so it cannot
// be sent twice.
export function useCollectionFavorite(
  collectionId: string,
  isFavorite: boolean,
  options?: FavoriteOptions,
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
        } else if (options?.undoable && current) {
          toast(UNFAVORITED_MESSAGE, {
            duration: UNDO_TOAST_DURATION,
            action: {
              label: "Undo",
              onClick: () => restoreFavorite(collectionId),
            },
          });
        }
      } catch {
        toast.error(FAVORITE_FAILED_MESSAGE);
      }
    });
  }

  return { isFavorite: current, isPending, toggle };
}
