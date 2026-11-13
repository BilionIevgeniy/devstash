import { toast } from "sonner";

import { useOptimisticToggle } from "@/features/items/_internal/components/hooks/use-optimistic-toggle";
import { setItemPin } from "@/features/items/actions/item";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";

const PIN_FAILED_MESSAGE = "Couldn't update the pin.";
const PINNED_MESSAGE = "Item pinned";
const UNPINNED_MESSAGE = "Item unpinned";

// The pins of a provider's rows and drawer (useOptimisticToggle). The toast
// confirms the button, which already shows the value; the lists follow with
// the action's refresh, so it may come just before they move. An undoable
// unpin offers Undo.
export function useItemPins(onSaved: (id: string, isPinned: boolean) => void) {
  const { overrides, toggle } = useOptimisticToggle(setItemPin, {
    failMessage: PIN_FAILED_MESSAGE,
    onSaved,
    notify: (_id, isPinned, options, undo) => {
      toast.success(
        isPinned ? PINNED_MESSAGE : UNPINNED_MESSAGE,
        options?.undoable && !isPinned
          ? {
              duration: UNDO_TOAST_DURATION,
              action: { label: "Undo", onClick: undo },
            }
          : undefined,
      );
    },
  });

  return { pinOverrides: overrides, togglePin: toggle };
}
