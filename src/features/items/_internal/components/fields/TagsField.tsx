"use client";

import type { ReactNode, Ref } from "react";
import { useTranslations } from "next-intl";
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
  /** Told each suggestion accepted into the field (ADR 0027). */
  onAcceptTag?: (tag: string) => void;
  /** The input, for the focus of a refused save. */
  ref?: Ref<HTMLInputElement>;
  /** Why the save refused the tags, shown under the field. */
  error?: string | null;
}

// The comma-separated tags of both forms. An accepted suggestion only changes
// the field: nothing is saved until the form's own Save.
export function TagsField({
  value,
  onChange,
  canUseAi,
  title,
  content,
  onAcceptTag,
  ref,
  error,
}: TagsFieldProps) {
  const t = useTranslations("items.fields");
  const errorText = useErrorText();
  function handleAccept(tag: string): boolean {
    const next = appendTag(value, tag);
    if (next === null) {
      toast.error(errorText(errorRef("tooManyTags", { max: TAGS_MAX })));
      return false;
    }
    onChange(next);
    onAcceptTag?.(tag.trim());
    return true;
  }

  const field = (action?: ReactNode) => (
    <Field label={t("tags")} hint={t("tagsHint")} action={action} error={error}>
      {(id, errorProps) => (
        <Input
          ref={ref}
          id={id}
          {...errorProps}
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
