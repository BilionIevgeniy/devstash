"use client";

import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { LanguageSelect } from "@/features/editor/components/LanguageSelect";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import { DescriptionField } from "@/features/items/_internal/components/DescriptionField";
import { TagsField } from "@/features/items/_internal/components/TagsField";
import type {
  ItemFormValues,
  ItemTextField,
} from "@/features/items/domain/item-changes";
import {
  aiSource,
  TITLE_MAX,
  URL_MAX,
  type EditableFields,
} from "@/features/items/domain/item-fields";

interface ItemFieldsProps {
  fields: EditableFields;
  values: ItemFormValues;
  /** Should close over a function update only, so it stays stable for Monaco. */
  onChange: (name: ItemTextField, value: string) => void;
  /** Shows the AI buttons of the description and the tags (Pro). */
  canUseAi: boolean;
  /** The upload's name, which the AI reads for a file or image. */
  fileName?: string | null;
}

// The text fields of the create and edit forms, in the same order in both;
// the URL, language and content show only for the types that have them. The
// AI fields are keyed by where their text comes from, so a type switch that
// changes it drops suggestions made from the old text.
export function ItemFields({
  fields,
  values,
  onChange,
  canUseAi,
  fileName,
}: ItemFieldsProps) {
  const source = aiSource(fields, { ...values, fileName });

  return (
    <>
      <Field label="Title">
        {(id) => (
          <Input
            id={id}
            value={values.title}
            onChange={(event) => onChange("title", event.target.value)}
            maxLength={TITLE_MAX}
            required
          />
        )}
      </Field>
      <DescriptionField
        key={`description-${source.kind}`}
        value={values.description}
        onChange={(value) => onChange("description", value)}
        canUseAi={canUseAi}
        title={values.title}
        content={source.text}
      />
      {fields.url && (
        <Field label="URL">
          {(id) => (
            <Input
              id={id}
              type="url"
              value={values.url}
              onChange={(event) => onChange("url", event.target.value)}
              maxLength={URL_MAX}
              required
            />
          )}
        </Field>
      )}
      {fields.language && (
        <Field label="Language">
          {(id) => (
            <LanguageSelect
              id={id}
              value={values.language}
              onChange={(value) => onChange("language", value)}
            />
          )}
        </Field>
      )}
      {fields.content && (
        <ContentField
          isCode={fields.codeEditor}
          value={values.content}
          language={values.language}
          onChange={(value) => onChange("content", value)}
        />
      )}
      <TagsField
        key={`tags-${source.kind}`}
        value={values.tags}
        onChange={(value) => onChange("tags", value)}
        canUseAi={canUseAi}
        title={values.title}
        content={source.text}
      />
    </>
  );
}

interface ContentFieldProps {
  isCode: boolean;
  value: string;
  language: string;
  onChange: (value: string) => void;
}

function ContentField({
  isCode,
  value,
  language,
  onChange,
}: ContentFieldProps) {
  return (
    <Field label="Content">
      {(id) =>
        isCode ? (
          <CodeEditor
            value={value}
            language={language}
            onChange={onChange}
            ariaLabel="Content"
          />
        ) : (
          <MarkdownEditor id={id} value={value} onChange={onChange} />
        )
      }
    </Field>
  );
}
