"use client";

import { useRef, useState, type SubmitEvent } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useSubmitDialog,
  type SubmitRun,
} from "@/components/common/hooks/use-submit-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProBadge } from "@/features/billing/components/ProBadge";
import type { EditorHandle } from "@/features/editor/types";
import type { UploadedFile } from "@/features/files/types";
import { CollectionSelect } from "@/features/items/_internal/components/CollectionSelect";
import { ItemFileField } from "@/features/items/_internal/components/ItemFileField";
import { ItemFields } from "@/features/items/_internal/components/ItemFields";
import { ItemTypeSelect } from "@/features/items/_internal/components/ItemTypeSelect";
import { submitNewItem } from "@/features/items/_internal/components/submit-new-item";
import type { ItemFormValues } from "@/features/items/domain/item-changes";
import {
  canCreateType,
  editableFields,
  type CreatableTypeName,
} from "@/features/items/domain/item-fields";

const DEFAULT_TYPE: CreatableTypeName = "snippet";
const EMPTY_VALUES: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
  collectionIds: [],
};
const CREATED_MESSAGE = "Item created";

interface CreateItemDialogProps {
  /** The type chosen when the dialog opens; also names the button. */
  defaultType?: CreatableTypeName;
  /** From getEntitlements on the server; the server checks again on create. */
  isPro: boolean;
  /** Opened from elsewhere: no button, and the focus goes back through this. */
  controlled?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    returnFocus: () => void;
  };
}

export function CreateItemDialog({
  defaultType,
  isPro,
  controlled,
}: CreateItemDialogProps) {
  const [isOpenState, setIsOpenState] = useState(false);
  const isOpen = controlled?.open ?? isOpenState;
  const setIsOpen = controlled?.onOpenChange ?? setIsOpenState;
  const { isPending: isCreating, run, takeDone } = useSubmitDialog();
  const label = `New ${defaultType ?? "item"}`;
  // A type page of a Pro type keeps its button for a Free user, disabled.
  const isLocked =
    defaultType !== undefined && !canCreateType(defaultType, isPro);

  // Esc, the overlay and the X wait for the result: closing now would lose
  // the input on a failure and let the form be sent twice.
  function handleOpenChange(open: boolean) {
    if (!isCreating) setIsOpen(open);
  }

  // Sonner is outside the transition, so a toast in the form would show
  // before the refreshed page closes the dialog. Radix calls this once the
  // dialog has closed, with or without an animation; focus still returns to
  // the trigger, or through `controlled`, which has none.
  function handleCloseAutoFocus(event: Event) {
    if (controlled) {
      event.preventDefault();
      controlled.returnFocus();
    }
    if (takeDone()) toast.success(CREATED_MESSAGE);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button disabled={isLocked}>
            <Plus />
            <span className="capitalize">{label}</span>
            {isLocked && <ProBadge />}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent
        className="max-h-[90vh] grid-cols-1 overflow-y-auto"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle className="capitalize">{label}</DialogTitle>
          <DialogDescription>
            Save a snippet, prompt, command, note, link, file or image.
          </DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts empty and
            a running upload is aborted. */}
        <CreateItemForm
          initialType={defaultType ?? DEFAULT_TYPE}
          isPro={isPro}
          isCreating={isCreating}
          run={run}
          onCreated={() => setIsOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateItemFormProps {
  initialType: CreatableTypeName;
  isPro: boolean;
  isCreating: boolean;
  run: SubmitRun;
  onCreated: () => void;
}

function CreateItemForm({
  initialType,
  isPro,
  isCreating,
  run,
  onCreated,
}: CreateItemFormProps) {
  const [typeName, setTypeName] = useState<CreatableTypeName>(initialType);
  const [values, setValues] = useState<ItemFormValues>(EMPTY_VALUES);
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const contentRef = useRef<EditorHandle>(null);
  const fields = editableFields(typeName);
  const isMissingRequired =
    values.title.trim() === "" ||
    (fields.url && values.url.trim() === "") ||
    (fields.file !== null && upload === null);

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
      onCreated,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

interface CreateFormFooterProps {
  isCreating: boolean;
  canCreate: boolean;
}

function CreateFormFooter({ isCreating, canCreate }: CreateFormFooterProps) {
  return (
    <DialogFooter>
      <DialogClose asChild>
        <Button type="button" variant="ghost" disabled={isCreating}>
          Cancel
        </Button>
      </DialogClose>
      <Button type="submit" disabled={isCreating || !canCreate}>
        {isCreating ? "Creating…" : "Create"}
      </Button>
    </DialogFooter>
  );
}
