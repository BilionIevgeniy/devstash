"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/items/_internal/components/Field";
import { updateItem } from "@/features/items/actions/item";
import {
  editableFields,
  parseTagInput,
} from "@/features/items/domain/item-fields";
import type { DashboardItem, ItemDetailJson } from "@/features/items/types";

const TAG_JOINER = ", ";
const SAVED_MESSAGE = "Item saved";
const SAVE_FAILED_MESSAGE = "Couldn't save the item";

interface ItemEditFormProps {
  item: DashboardItem;
  detail: ItemDetailJson;
  onCancel: () => void;
  onSaved: (detail: ItemDetailJson) => void;
  /** Shown read-only under the fields: collections and dates. */
  children?: ReactNode;
}

export function ItemEditForm({
  item,
  detail,
  onCancel,
  onSaved,
  children,
}: ItemEditFormProps) {
  const fields = editableFields(item.type.name);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? "");
  const [tags, setTags] = useState(item.tags.join(TAG_JOINER));
  const [content, setContent] = useState(detail.content ?? "");
  const [language, setLanguage] = useState(detail.language ?? "");
  const [url, setUrl] = useState(detail.url ?? "");
  const [isSaving, startSaving] = useTransition();

  // Only the fields of this type are sent, so a hidden field is never cleared.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await updateItem(item.id, {
        title,
        description,
        tags: parseTagInput(tags),
        ...(fields.content && { content }),
        ...(fields.language && { language }),
        ...(fields.url && { url }),
      });
      if (result.success && result.data) {
        toast.success(SAVED_MESSAGE);
        onSaved(result.data);
      } else {
        toast.error(result.error ?? SAVE_FAILED_MESSAGE);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-end gap-1 border-b px-6 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X />
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || title.trim() === ""}>
          <Check />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
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
            {(id) => (
              <Textarea
                id={id}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-40 font-mono text-xs md:text-xs"
              />
            )}
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
        {children}
      </div>
    </form>
  );
}
