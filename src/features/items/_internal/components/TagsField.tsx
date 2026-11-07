"use client";

import { toast } from "sonner";

import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { SuggestTagsButton } from "@/features/ai/components/SuggestTagsButton";
import {
  appendTag,
  hasTag,
  TAGS_MAX,
} from "@/features/items/domain/item-fields";

const TAGS_FULL_MESSAGE = `Up to ${TAGS_MAX} tags`;

interface TagsFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Pro only: the server refuses the suggestions anyway. */
  canUseAi: boolean;
  /** What the suggestions are made from. */
  title: string;
  content: string;
}

// The comma-separated tags of both forms. An accepted suggestion only changes
// the field: nothing is saved until the form's own Save.
export function TagsField({
  value,
  onChange,
  canUseAi,
  title,
  content,
}: TagsFieldProps) {
  function handleAccept(tag: string): boolean {
    const next = appendTag(value, tag);
    if (next === null) {
      toast.error(TAGS_FULL_MESSAGE);
      return false;
    }
    onChange(next);
    return true;
  }

  return (
    <div className="space-y-2">
      <Field label="Tags" hint="Separate tags with commas">
        {(id) => (
          <Input
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </Field>
      {canUseAi && (
        <SuggestTagsButton
          title={title}
          content={content}
          hasTag={(tag) => hasTag(value, tag)}
          onAccept={handleAccept}
        />
      )}
    </div>
  );
}
