import "client-only";

import type { RefObject } from "react";
import { toast } from "sonner";

import type { EditorHandle } from "@/features/editor/types";
import {
  contentError,
  type EditableFields,
} from "@/features/items/domain/item-fields";
import type { ErrorText } from "@/i18n/error-text";

// Stops a submit whose content the server would refuse, and tells the user
// where: the reason as a toast (in the words of the caller's `errorText`), the
// focus in the editor. Returns true when it
// stopped the submit. The editor takes no part until it has loaded, and then
// the toast is all there is.
export function rejectInvalidContent(
  fields: EditableFields,
  content: string,
  editor: RefObject<EditorHandle | null>,
  errorText: ErrorText,
): boolean {
  const error = contentError(fields, content);
  if (error === null) return false;

  toast.error(errorText(error));
  editor.current?.focus();
  return true;
}
