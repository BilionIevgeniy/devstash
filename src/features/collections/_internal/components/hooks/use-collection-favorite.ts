import { useOptimistic, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { setCollectionFavorite } from "@/features/collections/actions/collection";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";
import type { ErrorText } from "@/i18n/error-text";
import { isNavigationError } from "@/lib/navigation-error";

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
async function restoreFavorite(collectionId: string, errorText: ErrorText) {
  try {
    const result = await setCollectionFavorite(collectionId, true);
    if (!result.success) {
      toast.error(errorText(result));
    }
  } catch (error) {
    if (isNavigationError(error)) return;
    toast.error(errorText("favoriteFailed"));
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
  const t = useTranslations("common");
  const [current, setCurrent] = useOptimistic(isFavorite);
  const [isPending, startTransition] = useTransition();
  const errorText = useErrorText();

  function toggle() {
    if (isPending) return;

    startTransition(async () => {
      setCurrent(!current);
      try {
        const result = await setCollectionFavorite(collectionId, !current);
        if (!result.success) {
          toast.error(errorText(result));
        } else if (options?.undoable && current) {
          toast(t("removedFromFavorites"), {
            duration: UNDO_TOAST_DURATION,
            action: {
              label: t("actions.undo"),
              onClick: () => restoreFavorite(collectionId, errorText),
            },
          });
        }
      } catch (error) {
        // Inside useTransition: the redirect goes on, as in the dialogs.
        unstable_rethrow(error);
        toast.error(errorText("favoriteFailed"));
      }
    });
  }

  return { isFavorite: current, isPending, toggle };
}
