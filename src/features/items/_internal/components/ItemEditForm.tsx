"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type SubmitEvent, type ReactNode } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EditorHandle } from "@/features/editor/types";
import { CollectionSelect } from "@/features/items/_internal/components/CollectionSelect";
import { DiscardChangesDialog } from "@/features/items/_internal/components/DiscardChangesDialog";
import { ItemFields } from "@/features/items/_internal/components/ItemFields";
import { useItemSave } from "@/features/items/_internal/components/hooks/use-item-save";
import { useUnsavedChanges } from "@/features/items/_internal/components/hooks/use-unsaved-changes";
import {
  hasItemChanges,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import {
  editableFields,
  TAG_JOINER,
} from "@/features/items/domain/item-fields";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

interface ItemEditFormProps {
  item: DashboardItem;
  detail: ItemDetailJson;
  /** Shows the AI buttons of the description and the tags (Pro). */
  canUseAi: boolean;
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

export function ItemEditForm({
  item,
  detail,
  canUseAi,
  onCancel,
  onSaved,
  onDirtyChange,
  children,
}: ItemEditFormProps) {
  const fields = editableFields(item.type.name);
  const initial = initialValues(item, detail);
  const [values, setValues] = useState(initial);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const contentRef = useRef<EditorHandle>(null);
  const { isSaving, save } = useItemSave(item.id, fields, contentRef, onSaved);
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
    if (isChanged) save(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <EditToolbar
        isSaving={isSaving}
        canSave={isChanged && !isMissingRequired}
        onCancel={handleCancel}
      >
        <DiscardChangesDialog
          open={isConfirmingCancel}
          onOpenChange={setIsConfirmingCancel}
          onDiscard={onCancel}
        />
      </EditToolbar>
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        <ItemFields
          fields={fields}
          values={values}
          onChange={setField}
          canUseAi={canUseAi}
          fileName={detail.file?.name}
          contentRef={contentRef}
        />
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

interface EditToolbarProps {
  isSaving: boolean;
  canSave: boolean;
  onCancel: () => void;
  children: ReactNode;
}

function EditToolbar({
  isSaving,
  canSave,
  onCancel,
  children,
}: EditToolbarProps) {
  const t = useTranslations("common.actions");
  return (
    <div className="flex items-center justify-end gap-1 border-b px-6 py-3">
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        disabled={isSaving}
      >
        <X />
        {t("cancel")}
      </Button>
      <Button type="submit" disabled={isSaving || !canSave}>
        <Check />
        {isSaving ? t("saving") : t("save")}
      </Button>
      {children}
    </div>
  );
}
