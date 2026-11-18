import { useRef, useState } from "react";

import type { EditorHandle } from "@/features/editor/types";
import type { ItemFormValues } from "@/features/items/domain/item-changes";
import {
  itemFormError,
  type CheckedItemField,
  type EditableFields,
} from "@/features/items/domain/item-fields";
import type { ErrorRef } from "@/i18n/error-codes";

/** The error of a refused field, shown under it. */
export type ItemFieldErrors = Partial<Record<CheckedItemField, ErrorRef>>;

interface RefusedField {
  field: CheckedItemField;
  error: ErrorRef;
}

// The checks of the create and edit forms before the save: the first field
// the server would refuse shows its error under it and takes the focus,
// instead of a toast after the round trip. The error goes as soon as that
// field changes. The rules are `itemFormError` of the domain, with no Zod, so
// the form's chunk stays small (docs/performance.md). The editor takes the
// focus only once it has loaded; until then the error under it is all there is.
export function useItemFormCheck(fields: EditableFields) {
  const [refused, setRefused] = useState<RefusedField | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  // The content editor, which has no native validation.
  const contentRef = useRef<EditorHandle>(null);

  /** Returns true when it stopped the save. */
  function reject(values: ItemFormValues): boolean {
    const found = itemFormError(fields, values);
    if (found === null) {
      setRefused(null);
      return false;
    }

    const { field, ...error } = found;
    setRefused({ field, error });
    if (field === "content") contentRef.current?.focus();
    else if (field === "url") urlRef.current?.focus();
    else tagsRef.current?.focus();
    return true;
  }

  function clear(name: string) {
    setRefused((current) => (current?.field === name ? null : current));
  }

  const errors: ItemFieldErrors = refused
    ? { [refused.field]: refused.error }
    : {};

  return { urlRef, tagsRef, contentRef, errors, reject, clear };
}

export type ItemFormCheck = ReturnType<typeof useItemFormCheck>;
