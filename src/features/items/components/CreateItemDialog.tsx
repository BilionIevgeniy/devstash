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
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { Field } from "@/features/items/_internal/components/Field";
import { createItem } from "@/features/items/actions/item";
import {
  CREATABLE_TYPES,
  editableFields,
  parseTagInput,
  type CreatableTypeName,
} from "@/features/items/domain/item-fields";

const DEFAULT_TYPE: CreatableTypeName = "snippet";
const CREATED_MESSAGE = "Item created";
const CREATE_FAILED_MESSAGE = "Couldn't create the item";

interface CreateItemDialogProps {
  /** The type chosen when the dialog opens; also names the button. */
  defaultType?: CreatableTypeName;
  className?: string;
}

export function CreateItemDialog({
  defaultType,
  className,
}: CreateItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const createdRef = useRef(false);
  const label = `New ${defaultType ?? "item"}`;

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
        <Button className={className}>
          <Plus />
          <span className="capitalize">{label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle className="capitalize">{label}</DialogTitle>
          <DialogDescription>
            Save a snippet, prompt, command, note or link.
          </DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts empty. */}
        <CreateItemForm
          initialType={defaultType ?? DEFAULT_TYPE}
          onCreated={handleCreated}
        />
      </DialogContent>
    </Dialog>
  );
}

interface CreateItemFormProps {
  initialType: CreatableTypeName;
  onCreated: () => void;
}

function CreateItemForm({ initialType, onCreated }: CreateItemFormProps) {
  const [typeName, setTypeName] = useState<CreatableTypeName>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [isCreating, startCreating] = useTransition();
  const fields = editableFields(typeName);
  const isMissingRequired =
    title.trim() === "" || (fields.url && url.trim() === "");

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
            onValueChange={(value) => setTypeName(value as CreatableTypeName)}
          >
            <SelectTrigger id={id} className="w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CREATABLE_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
      <Field label="Title">
        {(id) => (
          <Input
            id={id}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
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
              <Textarea
                id={id}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-40 font-mono text-xs md:text-xs"
              />
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
          {isCreating ? "Creating..." : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
