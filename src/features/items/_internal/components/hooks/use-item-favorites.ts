import { toast } from "sonner";

import { useOptimisticToggle } from "@/features/items/_internal/components/hooks/use-optimistic-toggle";
import { setItemFavorite } from "@/features/items/actions/item";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";

const FAVORITE_FAILED_MESSAGE = "Couldn't update the favorite.";
const UNFAVORITED_MESSAGE = "Removed from favorites";

// The stars of a provider's cards and drawer (useOptimisticToggle). Only an
// undoable unfavorite has a toast: the row leaves its list, so it offers Undo.
export function useItemFavorites(
  onSaved: (id: string, isFavorite: boolean) => void,
) {
  const { overrides, toggle } = useOptimisticToggle(setItemFavorite, {
    failMessage: FAVORITE_FAILED_MESSAGE,
    onSaved,
    notify: (_id, isFavorite, options, undo) => {
      if (!options?.undoable || isFavorite) return;
      toast(UNFAVORITED_MESSAGE, {
        duration: UNDO_TOAST_DURATION,
        action: { label: "Undo", onClick: undo },
      });
    },
  });

  return { favoriteOverrides: overrides, toggleFavorite: toggle };
}
