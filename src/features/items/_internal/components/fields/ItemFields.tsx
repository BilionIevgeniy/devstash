"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";

import { useErrorText } from "@/components/common/hooks/use-error-text";
import { Field } from "@/components/common/Field";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/features/editor/components/CodeEditor";
import { LanguageSelect } from "@/features/editor/components/LanguageSelect";
import { MarkdownEditor } from "@/features/editor/components/MarkdownEditor";
import type { EditorHandle } from "@/features/editor/types";
import { DescriptionField } from "@/features/items/_internal/components/fields/DescriptionField";
import { TagsField } from "@/features/items/_internal/components/fields/TagsField";
import type { AcceptedAiHandlers } from "@/features/items/_internal/components/hooks/use-accepted-ai";
import type { ItemFormCheck } from "@/features/items/_internal/components/hooks/use-item-form-check";
import type {
  ItemFormValues,
  ItemTextField,
} from "@/features/items/domain/item-changes";
import {
  aiSource,
  type CheckedItemField,
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
  /**
   * The check before the save: the error under a refused field, and the refs
   * it moves the focus to (the content editor's also serves a label click).
   */
  check: Pick<ItemFormCheck, "urlRef" | "tagsRef" | "contentRef" | "errors">;
  /** Told what is accepted from the AI, for the marks of the save. */
  acceptedAi: AcceptedAiHandlers;
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
  check,
  acceptedAi,
}: ItemFieldsProps) {
  const t = useTranslations("items.fields");
  const errorText = useErrorText();
  const source = aiSource(fields, { ...values, fileName });
  const { urlRef, tagsRef, contentRef, errors } = check;
  const errorOf = (field: CheckedItemField) =>
    errors[field] ? errorText(errors[field]) : null;

  return (
    <>
      <Field label={t("title")}>
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
        onAcceptSummary={acceptedAi.acceptDescription}
      />
      {fields.url && (
        <UrlField
          inputRef={urlRef}
          value={values.url}
          onChange={(value) => onChange("url", value)}
          error={errorOf("url")}
        />
      )}
      {fields.language && (
        <Field label={t("language")}>
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
          editorRef={contentRef}
          error={errorOf("content")}
        />
      )}
      <TagsField
        key={`tags-${source.kind}`}
        ref={tagsRef}
        error={errorOf("tags")}
        value={values.tags}
        onChange={(value) => onChange("tags", value)}
        canUseAi={canUseAi}
        title={values.title}
        content={source.text}
        onAcceptTag={acceptedAi.acceptTag}
      />
    </>
  );
}

interface UrlFieldProps {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

function UrlField({ inputRef, value, onChange, error }: UrlFieldProps) {
  const t = useTranslations("items.fields");
  return (
    <Field label={t("url")} error={error}>
      {(id, errorProps) => (
        <Input
          ref={inputRef}
          id={id}
          {...errorProps}
          type="url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={URL_MAX}
          required
        />
      )}
    </Field>
  );
}

interface ContentFieldProps {
  isCode: boolean;
  value: string;
  language: string;
  onChange: (value: string) => void;
  editorRef: RefObject<EditorHandle | null>;
  error: string | null;
}

// The label cannot reach Monaco's own textarea by `htmlFor`, so a click on it
// goes through the editor's handle. Both editors take that way: the handle of
// the Markdown editor also leaves its Preview tab, which `htmlFor` cannot.
// Monaco takes no `aria-describedby`, so its label carries the error.
function ContentField({
  isCode,
  value,
  language,
  onChange,
  editorRef,
  error,
}: ContentFieldProps) {
  const t = useTranslations("items.fields");
  return (
    <Field
      label={t("content")}
      error={error}
      onLabelClick={() => editorRef.current?.focus()}
    >
      {(id, errorProps) =>
        isCode ? (
          <CodeEditor
            ref={editorRef}
            value={value}
            language={language}
            onChange={onChange}
            ariaLabel={error ? t("contentWithError", { error }) : t("content")}
          />
        ) : (
          <MarkdownEditor
            ref={editorRef}
            id={id}
            errorProps={errorProps}
            value={value}
            onChange={onChange}
          />
        )
      }
    </Field>
  );
}
