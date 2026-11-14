import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useOptimisticToggle } from "@/features/items/_internal/components/hooks/use-optimistic-toggle";
import { setItemFavorite } from "@/features/items/actions/item";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";

// The stars of a provider's cards and drawer (useOptimisticToggle). Only an
// undoable unfavorite has a toast: the row leaves its list, so it offers Undo.
export function useItemFavorites(
  onSaved: (id: string, isFavorite: boolean) => void,
) {
  const t = useTranslations("common");
  const { overrides, toggle } = useOptimisticToggle(setItemFavorite, {
    failCode: "favoriteFailed",
    onSaved,
    notify: (_id, isFavorite, options, undo) => {
      if (!options?.undoable || isFavorite) return;
      toast(t("removedFromFavorites"), {
        duration: UNDO_TOAST_DURATION,
        action: { label: t("actions.undo"), onClick: undo },
      });
    },
  });

  return { favoriteOverrides: overrides, toggleFavorite: toggle };
}
