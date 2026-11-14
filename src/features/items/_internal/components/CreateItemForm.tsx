"use client";
import { useTranslations } from "next-intl";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
  type SubmitEvent,
} from "react";

import type { SubmitRun } from "@/components/common/hooks/use-submit-dialog";
import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import type { EditorHandle } from "@/features/editor/types";
import type { UploadedFile } from "@/features/files/types";
import { CollectionSelect } from "@/features/items/_internal/components/CollectionSelect";
import { ItemFileField } from "@/features/items/_internal/components/ItemFileField";
import { ItemFields } from "@/features/items/_internal/components/ItemFields";
import { ItemTypeSelect } from "@/features/items/_internal/components/ItemTypeSelect";
import { submitNewItem } from "@/features/items/_internal/components/submit-new-item";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import type { ItemFormValues } from "@/features/items/domain/item-changes";
import {
  editableFields,
  type CreatableTypeName,
} from "@/features/items/domain/item-fields";

const EMPTY_VALUES: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
  collectionIds: [],
};

const FOCUSABLE =
  "button:not([disabled]), input:not([disabled]), textarea:not([disabled])";

export interface CreateItemFormProps {
  initialType: CreatableTypeName;
  isPro: boolean;
  isCreating: boolean;
  run: SubmitRun;
  onCreated: () => void;
}

// The body of CreateItemDialog, loaded as its own chunk when the dialog is
// about to open, so the fields, the editors' wrappers, the upload and the AI
// parts do not ship with every page.
export function CreateItemForm({
  initialType,
  isPro,
  isCreating,
  run,
  onCreated,
}: CreateItemFormProps) {
  const [typeName, setTypeName] = useState<CreatableTypeName>(initialType);
  const [values, setValues] = useState<ItemFormValues>(EMPTY_VALUES);
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<EditorHandle>(null);
  const errorText = useErrorText();
  const syncItems = useSyncItemQueries();
  const fields = editableFields(typeName);
  const isMissingRequired =
    values.title.trim() === "" ||
    (fields.url && values.url.trim() === "") ||
    (fields.file !== null && upload === null);

  useLateFocus(formRef);

  function setField<K extends keyof ItemFormValues>(
    name: K,
    value: ItemFormValues[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  // An upload belongs to the kind it was made for, so a type switch drops it;
  // the key on FileUpload remounts it, which aborts a running PUT.
  function handleTypeChange(value: CreatableTypeName) {
    setTypeName(value);
    setUpload(null);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    submitNewItem({
      typeName,
      fields,
      values,
      upload,
      contentRef,
      run,
      errorText,
      syncItems,
      onCreated,
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <ItemTypeSelect
        value={typeName}
        onChange={handleTypeChange}
        isPro={isPro}
        disabled={isCreating}
      />
      {fields.file && (
        <ItemFileField
          key={typeName}
          kind={fields.file}
          onChange={setUpload}
          disabled={isCreating}
        />
      )}
      <ItemFields
        fields={fields}
        values={values}
        onChange={setField}
        canUseAi={isPro}
        fileName={upload?.fileName}
        contentRef={contentRef}
      />
      <CollectionSelect
        value={values.collectionIds}
        onChange={(ids) => setField("collectionIds", ids)}
        disabled={isCreating}
      />
      <CreateFormFooter
        isCreating={isCreating}
        canCreate={!isMissingRequired}
      />
    </form>
  );
}

// Opened before this chunk arrived, the dialog holds the focus on itself
// (CreateItemDialog); the first field takes it, as on an open with the form
// ready. A focus the user has moved on meanwhile stays where it is.
function useLateFocus(formRef: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const form = formRef.current;
    if (form && document.activeElement === form.closest("[role=dialog]")) {
      form.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }
  }, [formRef]);
}

interface CreateFormFooterProps {
  isCreating: boolean;
  canCreate: boolean;
}

function CreateFormFooter({ isCreating, canCreate }: CreateFormFooterProps) {
  const t = useTranslations("common.actions");
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="ghost" disabled={isCreating}>
          {t("cancel")}
        </Button>
      </DialogClose>
      <Button type="submit" disabled={isCreating || !canCreate}>
        {isCreating ? t("creating") : t("create")}
      </Button>
    </DialogFooter>
  );
}
