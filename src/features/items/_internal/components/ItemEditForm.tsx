"use client";

import {
  useState,
  useTransition,
  type SubmitEvent,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CollectionSelect } from "@/features/items/_internal/components/CollectionSelect";
import { DiscardChangesDialog } from "@/features/items/_internal/components/DiscardChangesDialog";
import { ItemFields } from "@/features/items/_internal/components/ItemFields";
import { useUnsavedChanges } from "@/features/items/_internal/components/hooks/use-unsaved-changes";
import { updateItem } from "@/features/items/actions/item";
import {
  hasItemChanges,
  typeFieldValues,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import {
  editableFields,
  parseTagInput,
  type EditableFields,
} from "@/features/items/domain/item-fields";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

const TAG_JOINER = ", ";
const SAVED_MESSAGE = "Item saved";
const SAVE_FAILED_MESSAGE = "Couldn't save the item";

// null after a failure, with the toast already shown. A signed-out caller's
// redirect rejects too, and must go on; any other rejection left in the
// transition would replace the form, with the user's edits, by an error page.
async function saveItem(
  itemId: string,
  payload: unknown,
): Promise<ItemDetailJson | null> {
  try {
    const result = await updateItem(itemId, payload);
    if (result.success && result.data) return result.data;
    toast.error(result.error ?? SAVE_FAILED_MESSAGE);
  } catch (error) {
    unstable_rethrow(error);
    toast.error(SAVE_FAILED_MESSAGE);
  }
  return null;
}

interface ItemEditFormProps {
  item: DashboardItem;
  detail: ItemDetailJson;
  onCancel: () => void;
  onSaved: (detail: ItemDetailJson) => void;
  /**
   * Told whether the form holds unsaved edits, and false once it unmounts, so
   * the sheet around it can ask before closing.
   */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Shown read-only under the fields: the dates. */
  children?: ReactNode;
}

function initialValues(
  item: DashboardItem,
  detail: ItemDetailJson,
): ItemFormValues {
  return {
    title: item.title,
    description: item.description ?? "",
    tags: item.tags.join(TAG_JOINER),
    content: detail.content ?? "",
    language: detail.language ?? "",
    url: detail.url ?? "",
    collectionIds: detail.collections.map((collection) => collection.id),
  };
}

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

export function ItemEditForm({
  item,
  detail,
  onCancel,
  onSaved,
  onDirtyChange,
  children,
}: ItemEditFormProps) {
  const fields = editableFields(item.type.name);
  const initial = initialValues(item, detail);
  const [values, setValues] = useState(initial);
  const [isSaving, startSaving] = useTransition();
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const isChanged = hasItemChanges(fields, initial, values);
  const isMissingRequired =
    values.title.trim() === "" || (fields.url && values.url.trim() === "");
  useUnsavedChanges(isChanged, onDirtyChange);

  function setField<K extends keyof ItemFormValues>(
    name: K,
    value: ItemFormValues[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleCancel() {
    if (isChanged) setIsConfirmingCancel(true);
    else onCancel();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isChanged) return;
    startSaving(async () => {
      const saved = await saveItem(item.id, updatePayload(fields, values));
      if (!saved) return;

      toast.success(SAVED_MESSAGE);
      // After the await this is no longer part of the transition, so it is
      // wrapped again: the form closes in the commit that brings the refreshed
      // page.
      startSaving(() => onSaved(saved));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-end gap-1 border-b px-6 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isMissingRequired || !isChanged}
        >
          <Check />
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <DiscardChangesDialog
          open={isConfirmingCancel}
          onOpenChange={setIsConfirmingCancel}
          onDiscard={onCancel}
        />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <ItemFields fields={fields} values={values} onChange={setField} />
        <CollectionSelect
          value={values.collectionIds}
          linked={detail.collections}
          onChange={(ids) => setField("collectionIds", ids)}
          disabled={isSaving}
        />
        {children}
      </div>
    </form>
  );
}
