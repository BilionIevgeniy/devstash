import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";

import { setItemFavorite } from "@/features/items/actions/item";
import type { ToggleOptions } from "@/features/items/components/hooks/use-item-drawer";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";
import { isNavigationError } from "@/lib/navigation-error";

const FAVORITE_FAILED_MESSAGE = "Couldn't update the favorite.";
const UNFAVORITED_MESSAGE = "Removed from favorites";
const NO_OVERRIDES: ReadonlyMap<string, boolean> = new Map();

interface FavoriteOverride {
  id: string;
  isFavorite: boolean;
}

// The stars of a provider's cards and drawer. The value shows while the
// transition runs: on success the action's refresh brings the fresh page before
// it ends; on failure the override goes and the star falls back. `onSaved` runs
// in a transition of its own, because an update after an await is outside the
// first one and would land after the override has gone.
export function useItemFavorites(
  onSaved: (id: string, isFavorite: boolean) => void,
) {
  const [favoriteOverrides, addOverride] = useOptimistic(
    NO_OVERRIDES,
    (overrides, { id, isFavorite }: FavoriteOverride) =>
      new Map(overrides).set(id, isFavorite),
  );

  function toggleFavorite(
    id: string,
    isFavorite: boolean,
    options?: ToggleOptions,
  ) {
    startTransition(async () => {
      addOverride({ id, isFavorite });
      try {
        const result = await setItemFavorite(id, isFavorite);
        if (result.success) {
          startTransition(() => onSaved(id, isFavorite));
          if (options?.undoable && !isFavorite) {
            toast(UNFAVORITED_MESSAGE, {
              duration: UNDO_TOAST_DURATION,
              action: {
                label: "Undo",
                onClick: () => toggleFavorite(id, true),
              },
            });
          }
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        if (isNavigationError(error)) return;
        toast.error(FAVORITE_FAILED_MESSAGE);
      }
    });
  }

  return { favoriteOverrides, toggleFavorite };
}
