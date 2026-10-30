"use client";

import {
  useState,
  useTransition,
  type SubmitEvent,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import { Field } from "@/features/items/_internal/components/Field";
import { updateItem } from "@/features/items/actions/item";
import {
  hasItemChanges,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
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
  const initial: ItemFormValues = {
    title: item.title,
    description: item.description ?? "",
    tags: item.tags.join(TAG_JOINER),
    content: detail.content ?? "",
    language: detail.language ?? "",
    url: detail.url ?? "",
  };
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [tags, setTags] = useState(initial.tags);
  const [content, setContent] = useState(initial.content);
  const [language, setLanguage] = useState(initial.language);
  const [url, setUrl] = useState(initial.url);
  const [isSaving, startSaving] = useTransition();
  const isChanged = hasItemChanges(fields, initial, {
    title,
    description,
    tags,
    content,
    language,
    url,
  });

  // Only the fields of this type are sent, so a hidden field is never cleared.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isChanged) return;
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
        <Button
          type="submit"
          disabled={isSaving || title.trim() === "" || !isChanged}
        >
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
        {children}
      </div>
    </form>
  );
}
