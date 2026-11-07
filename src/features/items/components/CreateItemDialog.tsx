"use client";

import {
  useRef,
  useState,
  useTransition,
  type SubmitEvent,
  type TransitionStartFunction,
} from "react";
import { unstable_rethrow } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

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
import type { UploadedFile } from "@/features/files/types";
import { CollectionSelect } from "@/features/items/_internal/components/CollectionSelect";
import { ItemFileField } from "@/features/items/_internal/components/ItemFileField";
import { ItemFields } from "@/features/items/_internal/components/ItemFields";
import { ItemTypeSelect } from "@/features/items/_internal/components/ItemTypeSelect";
import { createItem } from "@/features/items/actions/item";
import {
  typeFieldValues,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import {
  canCreateType,
  editableFields,
  parseTagInput,
  type CreatableTypeName,
  type EditableFields,
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
const CREATE_FAILED_MESSAGE = "Couldn't create the item";

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
  const [isCreating, startCreating] = useTransition();
  const createdRef = useRef(false);
  const label = `New ${defaultType ?? "item"}`;
  // A type page of a Pro type keeps its button for a Free user, disabled.
  const isLocked =
    defaultType !== undefined && !canCreateType(defaultType, isPro);

  // Esc, the overlay and the X wait for the result: closing now would lose
  // the input on a failure and let the form be sent twice.
  function handleOpenChange(open: boolean) {
    if (!isCreating) setIsOpen(open);
  }

  function handleCreated() {
    createdRef.current = true;
    setIsOpen(false);
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
    if (!createdRef.current) return;
    createdRef.current = false;
    toast.success(CREATED_MESSAGE);
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
          startCreating={startCreating}
          onCreated={handleCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateItemFormProps {
  initialType: CreatableTypeName;
  isPro: boolean;
  isCreating: boolean;
  startCreating: TransitionStartFunction;
  onCreated: () => void;
}

// Only the fields of the chosen type are sent; the others keep their input in
// case the type is switched back.
function createPayload(
  typeName: CreatableTypeName,
  fields: EditableFields,
  values: ItemFormValues,
  upload: UploadedFile | null,
) {
  return {
    typeName,
    title: values.title,
    description: values.description,
    tags: parseTagInput(values.tags),
    collectionIds: values.collectionIds,
    ...typeFieldValues(fields, values),
    ...(fields.file &&
      upload && { file: { key: upload.key, name: upload.fileName } }),
  };
}

function CreateItemForm({
  initialType,
  isPro,
  isCreating,
  startCreating,
  onCreated,
}: CreateItemFormProps) {
  const [typeName, setTypeName] = useState<CreatableTypeName>(initialType);
  const [values, setValues] = useState<ItemFormValues>(EMPTY_VALUES);
  const [upload, setUpload] = useState<UploadedFile | null>(null);
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
    startCreating(async () => {
      try {
        const result = await createItem(
          createPayload(typeName, fields, values, upload),
        );
        if (result.success) {
          // After the await this is no longer part of the transition, so it
          // is wrapped again: the dialog closes in the commit that brings the
          // refreshed page with the new item, not before it.
          startCreating(onCreated);
        } else {
          toast.error(result.error ?? CREATE_FAILED_MESSAGE);
        }
      } catch (error) {
        // A signed-out caller's redirect arrives here too, and must go on. A
        // rejection left in the transition would replace the page with an
        // error page, the root one or `(app)/error.tsx`, by where this mounts.
        unstable_rethrow(error);
        toast.error(CREATE_FAILED_MESSAGE);
      }
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
