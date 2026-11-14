import { startTransition, useOptimistic } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { deleteItem } from "@/features/items/actions/item";
import type { ErrorText } from "@/i18n/error-text";
import { isNavigationError } from "@/lib/navigation-error";

const NO_HIDDEN_IDS: ReadonlySet<string> = new Set();

async function deleteWithToast(
  id: string,
  deletedText: string,
  errorText: ErrorText,
) {
  try {
    const result = await deleteItem(id);
    if (result.success) toast.success(deletedText);
    else toast.error(errorText(result));
  } catch (error) {
    if (isNavigationError(error)) return;
    toast.error(errorText("itemDeleteFailed"));
  }
}

// The delete of a card from a list. The card is hidden while the transition
// runs. On success the action's refresh brings the page without the item
// before the transition ends; on failure the optimistic set reverts and the
// card comes back.
export function useItemRemoval() {
  const t = useTranslations("items.toasts");
  const errorText = useErrorText();
  const [hiddenIds, hideItem] = useOptimistic(
    NO_HIDDEN_IDS,
    (ids, id: string): ReadonlySet<string> => new Set(ids).add(id),
  );

  function remove(id: string) {
    startTransition(async () => {
      hideItem(id);
      await deleteWithToast(id, t("deleted"), errorText);
    });
  }

  return { hiddenIds, remove };
}
