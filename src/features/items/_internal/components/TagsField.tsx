"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { AiTagSuggestions } from "@/features/ai/components/AiTagSuggestions";
import {
  appendTag,
  hasTag,
  TAGS_MAX,
} from "@/features/items/domain/item-fields";
import { errorRef } from "@/i18n/error-codes";

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
  const errorText = useErrorText();
  function handleAccept(tag: string): boolean {
    const next = appendTag(value, tag);
    if (next === null) {
      toast.error(errorText(errorRef("tooManyTags", { max: TAGS_MAX })));
      return false;
    }
    onChange(next);
    return true;
  }

  const field = (action?: ReactNode) => (
    <Field label="Tags" hint="Separate tags with commas" action={action}>
      {(id) => (
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );

  if (!canUseAi) return field();

  return (
    <AiTagSuggestions
      title={title}
      content={content}
      hasTag={(tag) => hasTag(value, tag)}
      onAccept={handleAccept}
    >
      {field}
    </AiTagSuggestions>
  );
}
