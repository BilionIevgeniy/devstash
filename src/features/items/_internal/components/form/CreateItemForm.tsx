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
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { CollectionSelect } from "@/features/items/_internal/components/fields/CollectionSelect";
import { ItemFileField } from "@/features/items/_internal/components/fields/ItemFileField";
import { ItemFields } from "@/features/items/_internal/components/fields/ItemFields";
import { useAcceptedAi } from "@/features/items/_internal/components/hooks/use-accepted-ai";
import { useItemFormCheck } from "@/features/items/_internal/components/hooks/use-item-form-check";
import { useTypeChoice } from "@/features/items/_internal/components/hooks/use-type-choice";
import { ItemTypeSelect } from "@/features/items/_internal/components/fields/ItemTypeSelect";
import { submitNewItem } from "@/features/items/_internal/components/form/submit-new-item";
import { useSyncItemQueries } from "@/features/items/components/hooks/use-item-queries";
import {
  isMissingRequired,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import { editableFields } from "@/features/items/domain/item-fields";

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
  /** A system type's name or one of the user's custom types. */
  initialType: string;
  /** The user's custom types, offered after the system types. */
  customTypeNames: readonly string[];
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
  customTypeNames,
  isPro,
  isCreating,
  run,
  onCreated,
}: CreateItemFormProps) {
  const { typeName, changeType, upload, setUpload } =
    useTypeChoice(initialType);
  const [values, setValues] = useState<ItemFormValues>(EMPTY_VALUES);
  const formRef = useRef<HTMLFormElement>(null);
  const acceptedAi = useAcceptedAi();
  const syncItems = useSyncItemQueries();
  const fields = editableFields(typeName);
  const check = useItemFormCheck(fields);

  useLateFocus(formRef);

  function setField<K extends keyof ItemFormValues>(
    name: K,
    value: ItemFormValues[K],
  ) {
    setValues((current) => ({ ...current, [name]: value }));
    check.clear(name);
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    submitNewItem({
      typeName,
      fields,
      values,
      aiGenerated: acceptedAi.claims(values),
      upload,
      rejectInvalid: check.reject,
      run,
      syncItems,
      onCreated,
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <ItemTypeSelect
        value={typeName}
        onChange={changeType}
        customTypeNames={customTypeNames}
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
        check={check}
        acceptedAi={acceptedAi}
      />
      <CollectionSelect
        value={values.collectionIds}
        onChange={(ids) => setField("collectionIds", ids)}
        disabled={isCreating}
      />
      <CreateFormFooter
        isCreating={isCreating}
        canCreate={!isMissingRequired(fields, values, upload !== null)}
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
