"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import { Field } from "@/features/items/_internal/components/Field";
import type { ItemFormValues } from "@/features/items/domain/item-changes";
import {
  DESCRIPTION_MAX,
  LANGUAGE_MAX,
  TITLE_MAX,
  URL_MAX,
  type EditableFields,
} from "@/features/items/domain/item-fields";

interface ItemFieldsProps {
  fields: EditableFields;
  values: ItemFormValues;
  /** Should close over a function update only, so it stays stable for Monaco. */
  onChange: (name: keyof ItemFormValues, value: string) => void;
}

// The text fields of the create and edit forms, in the same order in both;
// the URL, language and content show only for the types that have them.
export function ItemFields({ fields, values, onChange }: ItemFieldsProps) {
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
      <Field label="Description">
        {(id) => (
          <Textarea
            id={id}
            value={values.description}
            onChange={(event) => onChange("description", event.target.value)}
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
            <Input
              id={id}
              value={values.language}
              onChange={(event) => onChange("language", event.target.value)}
              maxLength={LANGUAGE_MAX}
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
      <Field label="Tags" hint="Separate tags with commas">
        {(id) => (
          <Input
            id={id}
            value={values.tags}
            onChange={(event) => onChange("tags", event.target.value)}
          />
        )}
      </Field>
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
