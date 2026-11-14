import { useTranslations } from "next-intl";
import { useTransition, type RefObject } from "react";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import type { EditorHandle } from "@/features/editor/types";
import { callAction } from "@/features/items/_internal/components/call-action";
import { rejectInvalidContent } from "@/features/items/_internal/components/reject-invalid-content";
import { updateItem } from "@/features/items/actions/item";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import {
  typeFieldValues,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import {
  parseTagInput,
  type EditableFields,
} from "@/features/items/domain/item-fields";
import type { ItemDetailJson } from "@/features/items/types";

// Only the fields of this type are sent, so a hidden field is never cleared.
function updatePayload(fields: EditableFields, values: ItemFormValues) {
  return {
    title: values.title,
    description: values.description,
    tags: parseTagInput(values.tags),
    collectionIds: values.collectionIds,
    ...typeFieldValues(fields, values),
  };
}

// The save of the edit form: content the server would refuse stops here, the
// rest goes to the action, and the form closes in the commit that brings the
// refreshed page.
export function useItemSave(
  itemId: string,
  fields: EditableFields,
  contentRef: RefObject<EditorHandle | null>,
  onSaved: (detail: ItemDetailJson) => void,
) {
  const t = useTranslations("items.toasts");
  const errorText = useErrorText();
  const syncItems = useSyncItemQueries();
  const [isSaving, startSaving] = useTransition();

  function save(values: ItemFormValues) {
    if (rejectInvalidContent(fields, values.content, contentRef, errorText)) {
      return;
    }
    startSaving(async () => {
      const saved = await callAction(
        () => updateItem(itemId, updatePayload(fields, values)),
        "itemSaveFailed",
        errorText,
      );
      if (!saved) return;

      // The cached detail and rows take the saved text before the form closes.
      await syncItems({ kind: "saved", detail: saved });
      toast.success(t("saved"));
      // After the await this is no longer part of the transition, so it is
      // wrapped again: the form closes in the commit that brings the refreshed
      // page.
      startSaving(() => onSaved(saved));
    });
  }

  return { isSaving, save };
}
