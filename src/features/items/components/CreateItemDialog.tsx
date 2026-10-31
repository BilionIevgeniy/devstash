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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProBadge } from "@/features/billing/components/ProBadge";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import { FileUpload } from "@/features/files/components/FileUpload";
import type { UploadedFile } from "@/features/files/types";
import { Field } from "@/features/items/_internal/components/Field";
import { createItem } from "@/features/items/actions/item";
import {
  canCreateType,
  CREATABLE_TYPES,
  DESCRIPTION_MAX,
  editableFields,
  LANGUAGE_MAX,
  parseTagInput,
  TITLE_MAX,
  URL_MAX,
  type CreatableTypeName,
} from "@/features/items/domain/item-fields";

const DEFAULT_TYPE: CreatableTypeName = "snippet";
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const [isCreating, startCreating] = useTransition();
  const fields = editableFields(typeName);
  const isMissingRequired =
    title.trim() === "" ||
    (fields.url && url.trim() === "") ||
    (fields.file !== null && upload === null);

  // An upload belongs to the kind it was made for, so a type switch drops it;
  // the key on FileUpload remounts it, which aborts a running PUT.
  function handleTypeChange(value: string) {
    setTypeName(value as CreatableTypeName);
    setUpload(null);
  }

  // Only the fields of the chosen type are sent; the others keep their input
  // in case the type is switched back.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    startCreating(async () => {
      const result = await createItem({
        typeName,
        title,
        description,
        tags: parseTagInput(tags),
        ...(fields.content && { content }),
        ...(fields.language && { language }),
        ...(fields.url && { url }),
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
      <Field label="Type">
        {(id) => (
          <Select
            value={typeName}
            onValueChange={handleTypeChange}
            disabled={isCreating}
          >
            <SelectTrigger id={id} className="w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATABLE_TYPES.map((type) => {
                const isAllowed = canCreateType(type, isPro);
                return (
                  <SelectItem
                    key={type}
                    value={type}
                    disabled={!isAllowed}
                    className="capitalize"
                  >
                    {type}
                    {!isAllowed && <ProBadge />}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
      </Field>
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
      <Field label="Title">
        {(id) => (
          <Input
            id={id}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX}
            required
          />
        )}
      </Field>
      <Field label="Description">
        {(id) => (
          <Textarea
            id={id}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DESCRIPTION_MAX}
          />
        )}
      </Field>
      {fields.url && (
        <Field label="URL">
          {(id) => (
            <Input
              id={id}
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              maxLength={URL_MAX}
              required
            />
          )}
        </Field>
      )}
      {fields.language && (
        <Field label="Language">
          {(id) => (
            <Input
              id={id}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              maxLength={LANGUAGE_MAX}
            />
          )}
        </Field>
      )}
      {fields.content && (
        <Field label="Content">
          {(id) =>
            fields.codeEditor ? (
              <CodeEditor
                value={content}
                language={language}
                onChange={setContent}
                ariaLabel="Content"
              />
            ) : (
              <MarkdownEditor id={id} value={content} onChange={setContent} />
            )
          }
        </Field>
      )}
      <Field label="Tags" hint="Separate tags with commas">
        {(id) => (
          <Input
            id={id}
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        )}
      </Field>
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
