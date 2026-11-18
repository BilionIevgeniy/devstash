"use client";

import { useTranslations } from "next-intl";
import { useState, type SubmitEvent, type ReactNode } from "react";
import { Check, X } from "lucide-react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FREE_ITEM_LIMIT } from "@/features/billing/domain/limits";
import { UPGRADE_PATH } from "@/features/billing/domain/upgrade";
import { CollectionSelect } from "@/features/items/_internal/components/fields/CollectionSelect";
import { DiscardChangesDialog } from "@/features/items/_internal/components/form/DiscardChangesDialog";
import { ItemFields } from "@/features/items/_internal/components/fields/ItemFields";
import { useAcceptedAi } from "@/features/items/_internal/components/hooks/use-accepted-ai";
import { useItemFormCheck } from "@/features/items/_internal/components/hooks/use-item-form-check";
import { useItemSave } from "@/features/items/_internal/components/hooks/use-item-save";
import { useUnsavedChanges } from "@/features/items/_internal/components/hooks/use-unsaved-changes";
import {
  hasItemChanges,
  isMissingRequired,
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
  /**
   * Over the Free limit (ADR 0032): the text stays as it is and only the
   * collections can change, which the server allows too.
   */
  collectionsOnly?: boolean;
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
  collectionsOnly = false,
  onCancel,
  onSaved,
  onDirtyChange,
  children,
}: ItemEditFormProps) {
  const fields = editableFields(item.type.name);
  const initial = initialValues(item, detail);
  const [values, setValues] = useState(initial);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const acceptedAi = useAcceptedAi();
  const check = useItemFormCheck(fields);
  // Only the collections can change while the text is locked, so its fields,
  // which are not shown, are not checked.
  const { isSaving, save } = useItemSave(
    item.id,
    fields,
    collectionsOnly ? () => false : check.reject,
    onSaved,
  );
  const isChanged = hasItemChanges(fields, initial, values);
  useUnsavedChanges(isChanged, onDirtyChange);

  function setField<K extends keyof ItemFormValues>(
    name: K,
    value: ItemFormValues[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
    check.clear(name);
  }

  function handleCancel() {
    if (isChanged) setIsConfirmingCancel(true);
    else onCancel();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isChanged) save(values, acceptedAi.claims(values));
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <EditToolbar
        isSaving={isSaving}
        canSave={isChanged && !isMissingRequired(fields, values, true)}
        onCancel={handleCancel}
      >
        <DiscardChangesDialog
          open={isConfirmingCancel}
          onOpenChange={setIsConfirmingCancel}
          onDiscard={onCancel}
        />
      </EditToolbar>
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {collectionsOnly ? (
          <TextLockedNote />
        ) : (
          <ItemFields
            fields={fields}
            values={values}
            onChange={setField}
            canUseAi={canUseAi}
            fileName={detail.file?.name}
            check={check}
            acceptedAi={acceptedAi}
          />
        )}
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

// The text of an account over the Free limit is read-only: the note says why
// and where it opens again; the drawer behind shows the text itself.
function TextLockedNote() {
  const t = useTranslations("items.edit");
  return (
    <p className="rounded-md border p-3 text-sm text-muted-foreground">
      {t.rich("textLocked", {
        limit: FREE_ITEM_LIMIT,
        link: (chunks) => (
          <Link href={UPGRADE_PATH} className="underline underline-offset-4">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
