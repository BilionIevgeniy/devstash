import "client-only";

import type { RefObject } from "react";

import type { SubmitRun } from "@/components/common/hooks/use-submit-dialog";
import type { EditorHandle } from "@/features/editor/types";
import type { UploadedFile } from "@/features/files/types";
import { rejectInvalidContent } from "@/features/items/_internal/components/reject-invalid-content";
import { createItem } from "@/features/items/actions/item";
import {
  typeFieldValues,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import {
  parseTagInput,
  type CreatableTypeName,
  type EditableFields,
} from "@/features/items/domain/item-fields";

const CREATE_FAILED_MESSAGE = "Couldn't create the item";

export interface NewItemSubmission {
  typeName: CreatableTypeName;
  fields: EditableFields;
  values: ItemFormValues;
  upload: UploadedFile | null;
  contentRef: RefObject<EditorHandle | null>;
  run: SubmitRun;
  /** Called in the commit that brings the refreshed page with the new item. */
  onCreated: () => void;
}

// Only the fields of the chosen type are sent; the others keep their input in
// case the type is switched back.
function createPayload(
  typeName: CreatableTypeName,
  fields: EditableFields,
  values: ItemFormValues,
  upload: UploadedFile | null,
) {
  return {
    typeName,
    title: values.title,
    description: values.description,
    tags: parseTagInput(values.tags),
    collectionIds: values.collectionIds,
    ...typeFieldValues(fields, values),
    ...(fields.file &&
      upload && { file: { key: upload.key, name: upload.fileName } }),
  };
}

// The create dialog's submit: content the server would refuse stops here, the
// rest goes to the action through the dialog's run (useSubmitDialog).
export function submitNewItem({
  typeName,
  fields,
  values,
  upload,
  contentRef,
  run,
  onCreated,
}: NewItemSubmission): void {
  if (rejectInvalidContent(fields, values.content, contentRef)) return;

  run(() => createItem(createPayload(typeName, fields, values, upload)), {
    onSuccess: onCreated,
    failMessage: CREATE_FAILED_MESSAGE,
  });
}
