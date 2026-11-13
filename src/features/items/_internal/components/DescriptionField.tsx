"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Field } from "@/components/common/Field";
import { Textarea } from "@/components/ui/textarea";
import { AiDescriptionSummary } from "@/features/ai/components/AiDescriptionSummary";
import { DESCRIPTION_MAX } from "@/features/items/domain/item-fields";

interface DescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Pro only: the server refuses the summary anyway. */
  canUseAi: boolean;
  /** What the summary is made from. */
  title: string;
  content: string;
}

// The description of both forms. An accepted summary only changes the field:
// nothing is saved until the form's own Save.
export function DescriptionField({
  value,
  onChange,
  canUseAi,
  title,
  content,
}: DescriptionFieldProps) {
  const t = useTranslations("items.fields");
  const field = (action?: ReactNode) => (
    <Field label={t("description")} action={action}>
      {(id) => (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={DESCRIPTION_MAX}
        />
      )}
    </Field>
  );

  if (!canUseAi) return field();

  return (
    <AiDescriptionSummary
      title={title}
      content={content}
      currentValue={value}
      onAccept={(summary) => onChange(summary.slice(0, DESCRIPTION_MAX))}
    >
      {field}
    </AiDescriptionSummary>
  );
}
