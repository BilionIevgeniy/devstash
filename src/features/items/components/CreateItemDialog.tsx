"use client";

import { useRef, useState, useTransition, type SubmitEvent } from "react";
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
import { FileUpload } from "@/features/files/components/FileUpload";
import type { UploadedFile } from "@/features/files/types";
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
} from "@/features/items/domain/item-fields";

const DEFAULT_TYPE: CreatableTypeName = "snippet";
const EMPTY_VALUES: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
};
const CREATED_MESSAGE = "Item created";
const CREATE_FAILED_MESSAGE = "Couldn't create the item";

interface CreateItemDialogProps {
  /** The type chosen when the dialog opens; also names the button. */
  defaultType?: CreatableTypeName;
  /** From getEntitlements on the server; the server checks again on create. */
  isPro: boolean;
  className?: string;
}

export function CreateItemDialog({
  defaultType,
  isPro,
  className,
}: CreateItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createdRef = useRef(false);
  const label = `New ${defaultType ?? "item"}`;
  // A type page of a Pro type keeps its button for a Free user, disabled.
  const isLocked =
    defaultType !== undefined && !canCreateType(defaultType, isPro);

  function handleCreated() {
    createdRef.current = true;
    setIsOpen(false);
  }

  // Sonner is outside the transition, so a toast in the form would show
  // before the refreshed page closes the dialog. Radix calls this once the
  // dialog has closed, with or without an animation; focus still returns to
  // the trigger.
  function handleCloseAutoFocus() {
    if (!createdRef.current) return;
    createdRef.current = false;
    toast.success(CREATED_MESSAGE);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={className} disabled={isLocked}>
          <Plus />
          <span className="capitalize">{label}</span>
          {isLocked && <ProBadge />}
        </Button>
      </DialogTrigger>
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
          onCreated={handleCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateItemFormProps {
  initialType: CreatableTypeName;
  isPro: boolean;
  onCreated: () => void;
}

function CreateItemForm({
  initialType,
  isPro,
  onCreated,
}: CreateItemFormProps) {
  const [typeName, setTypeName] = useState<CreatableTypeName>(initialType);
  const [values, setValues] = useState<ItemFormValues>(EMPTY_VALUES);
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const [isCreating, startCreating] = useTransition();
  const fields = editableFields(typeName);
  const isMissingRequired =
    values.title.trim() === "" ||
    (fields.url && values.url.trim() === "") ||
    (fields.file !== null && upload === null);

  function setField(name: keyof ItemFormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  // An upload belongs to the kind it was made for, so a type switch drops it;
  // the key on FileUpload remounts it, which aborts a running PUT.
  function handleTypeChange(value: CreatableTypeName) {
    setTypeName(value);
    setUpload(null);
  }

  // Only the fields of the chosen type are sent; the others keep their input
  // in case the type is switched back.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    startCreating(async () => {
      const result = await createItem({
        typeName,
        title: values.title,
        description: values.description,
        tags: parseTagInput(values.tags),
        ...typeFieldValues(fields, values),
        ...(fields.file &&
          upload && { file: { key: upload.key, name: upload.fileName } }),
      });
      if (result.success) {
        // After the await this is no longer part of the transition, so it is
        // wrapped again: the dialog closes in the commit that brings the
        // refreshed page with the new item, not before it.
        startCreating(onCreated);
      } else {
        toast.error(result.error ?? CREATE_FAILED_MESSAGE);
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
        // Not a Field: its label points at an input, and the drop zone is
        // named by its own aria-label.
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground capitalize">
            {fields.file}
          </p>
          <FileUpload
            key={typeName}
            kind={fields.file}
            onChange={setUpload}
            disabled={isCreating}
          />
        </div>
      )}
      <ItemFields fields={fields} values={values} onChange={setField} />
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost" disabled={isCreating}>
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isCreating || isMissingRequired}>
          {isCreating ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
