import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";

import { toggleItemPin } from "@/features/items/actions/item";
import type { ToggleOptions } from "@/features/items/components/hooks/use-item-drawer";
import { UNDO_TOAST_DURATION } from "@/features/items/domain/list-rows";

const PIN_FAILED_MESSAGE = "Couldn't update the pin.";
const PINNED_MESSAGE = "Item pinned";
const UNPINNED_MESSAGE = "Item unpinned";
const NO_OVERRIDES: ReadonlyMap<string, boolean> = new Map();

interface PinOverride {
  id: string;
  isPinned: boolean;
}

// The pins of a provider's rows and drawer, on the same plan as
// useItemFavorites: the value shows while the transition runs, and `onSaved` has
// a transition of its own. The toast confirms the button, which already shows
// the value; the lists follow with the action's refresh, so it may come just
// before they move.
export function useItemPins(onSaved: (id: string, isPinned: boolean) => void) {
  const [pinOverrides, addOverride] = useOptimistic(
    NO_OVERRIDES,
    (overrides, { id, isPinned }: PinOverride) =>
      new Map(overrides).set(id, isPinned),
  );

  function togglePin(id: string, isPinned: boolean, options?: ToggleOptions) {
    startTransition(async () => {
      addOverride({ id, isPinned });
      try {
        const result = await toggleItemPin(id, isPinned);
        if (result.success) {
          startTransition(() => onSaved(id, isPinned));
          toast.success(
            isPinned ? PINNED_MESSAGE : UNPINNED_MESSAGE,
            options?.undoable && !isPinned
              ? {
                  duration: UNDO_TOAST_DURATION,
                  action: {
                    label: "Undo",
                    onClick: () => togglePin(id, true),
                  },
                }
              : undefined,
          );
        } else {
          toast.error(result.error ?? PIN_FAILED_MESSAGE);
        }
      } catch {
        toast.error(PIN_FAILED_MESSAGE);
      }
    });
  }

  return { pinOverrides, togglePin };
}
