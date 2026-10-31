"use client";

import {
  useEffect,
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
import { DiscardChangesDialog } from "@/features/items/_internal/components/DiscardChangesDialog";
import { Field } from "@/features/items/_internal/components/Field";
import { updateItem } from "@/features/items/actions/item";
import {
  hasItemChanges,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import {
  DESCRIPTION_MAX,
  editableFields,
  LANGUAGE_MAX,
  parseTagInput,
  TITLE_MAX,
  URL_MAX,
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
  /**
   * Told whether the form holds unsaved edits, and false once it unmounts, so
   * the sheet around it can ask before closing.
   */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Shown read-only under the fields: collections and dates. */
  children?: ReactNode;
}

export function ItemEditForm({
  item,
  detail,
  onCancel,
  onSaved,
  onDirtyChange,
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
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const isChanged = hasItemChanges(fields, initial, {
    title,
    description,
    tags,
    content,
    language,
    url,
  });
  const isMissingRequired =
    title.trim() === "" || (fields.url && url.trim() === "");

  // Reported from an effect: the owner keeps it in a ref, and setting a
  // parent's state during this render is not allowed. The cleanup clears it
  // after a save or Cancel unmounts the form.
  useEffect(() => {
    onDirtyChange?.(isChanged);
    return () => onDirtyChange?.(false);
  }, [isChanged, onDirtyChange]);

  // A reload or a closed tab would drop the edits without a word.
  useEffect(() => {
    if (!isChanged) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isChanged]);

  function handleCancel() {
    if (isChanged) setIsConfirmingCancel(true);
    else onCancel();
  }

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
          onClick={handleCancel}
          disabled={isSaving}
        >
          <X />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving || isMissingRequired || !isChanged}
        >
          <Check />
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <DiscardChangesDialog
          open={isConfirmingCancel}
          onOpenChange={setIsConfirmingCancel}
          onDiscard={onCancel}
        />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
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
        {children}
      </div>
    </form>
  );
}
