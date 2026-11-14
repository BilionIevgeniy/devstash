import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useOptimisticToggle } from "@/features/items/_internal/components/hooks/use-optimistic-toggle";
import { setItemPin } from "@/features/items/actions/item";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";

// The pins of a provider's rows and drawer (useOptimisticToggle). The toast
// confirms the button, which already shows the value; the lists follow with
// the action's refresh, so it may come just before they move. An undoable
// unpin offers Undo.
export function useItemPins(onSaved: (id: string, isPinned: boolean) => void) {
  const t = useTranslations();
  const syncItems = useSyncItemQueries();
  const { overrides, toggle } = useOptimisticToggle(setItemPin, {
    failCode: "pinFailed",
    sync: (id, isPinned) => syncItems({ kind: "pin", id, isPinned }),
    onSaved,
    notify: (_id, isPinned, options, undo) => {
      toast.success(
        isPinned ? t("items.toasts.pinned") : t("items.toasts.unpinned"),
        options?.undoable && !isPinned
          ? {
              duration: UNDO_TOAST_DURATION,
              action: { label: t("common.actions.undo"), onClick: undo },
            }
          : undefined,
      );
    },
  });

  return { pinOverrides: overrides, togglePin: toggle };
}
