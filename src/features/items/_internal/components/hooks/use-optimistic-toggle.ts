import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import type { ToggleOptions } from "@/features/items/components/hooks/use-item-drawer";
import type { PlainErrorCode } from "@/i18n/error-codes";
import type { ActionResult } from "@/lib/action-result";
import { isNavigationError } from "@/lib/navigation-error";

const NO_OVERRIDES: ReadonlyMap<string, boolean> = new Map();

interface Override {
  id: string;
  value: boolean;
}

interface ToggleConfig {
  /** Shown when the action throws; a refused result shows its own code. */
  failCode: PlainErrorCode;
  /** The provider's own state, updated in a transition of its own. */
  onSaved: (id: string, value: boolean) => void;
  /** The toast of a saved value; `undo` sets it back. */
  notify: (
    id: string,
    value: boolean,
    options: ToggleOptions | undefined,
    undo: () => void,
  ) => void;
}

// A flag of a provider's cards and drawer (the star, the pin). The value shows
// while the transition runs: on success the action's refresh brings the fresh
// page before it ends; on failure the override goes and the flag falls back.
// `onSaved` runs in a transition of its own, because an update after an await
// is outside the first one and would land after the override has gone.
export function useOptimisticToggle(
  action: (id: string, value: boolean) => Promise<ActionResult>,
  { failCode, onSaved, notify }: ToggleConfig,
) {
  const errorText = useErrorText();
  const [overrides, addOverride] = useOptimistic(
    NO_OVERRIDES,
    (current, { id, value }: Override) => new Map(current).set(id, value),
  );

  function toggle(id: string, value: boolean, options?: ToggleOptions) {
    startTransition(async () => {
      addOverride({ id, value });
      try {
        const result = await action(id, value);
        if (!result.success) {
          toast.error(errorText(result));
          return;
        }
        startTransition(() => onSaved(id, value));
        notify(id, value, options, () => toggle(id, !value));
      } catch (error) {
        if (isNavigationError(error)) return;
        toast.error(errorText(failCode));
      }
    });
  }

  return { overrides, toggle };
}
