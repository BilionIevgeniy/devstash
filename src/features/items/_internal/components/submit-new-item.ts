import "client-only";

import { unstable_rethrow } from "next/navigation";
import type { RefObject, TransitionStartFunction } from "react";
import { toast } from "sonner";

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
  startCreating: TransitionStartFunction;
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
// rest goes to the action inside the caller's transition.
export function submitNewItem({
  typeName,
  fields,
  values,
  upload,
  contentRef,
  startCreating,
  onCreated,
}: NewItemSubmission): void {
  if (rejectInvalidContent(fields, values.content, contentRef)) return;

  startCreating(async () => {
    try {
      const result = await createItem(
        createPayload(typeName, fields, values, upload),
      );
      if (result.success) {
        // After the await this is no longer part of the transition, so it
        // is wrapped again: the dialog closes in the commit that brings the
        // refreshed page with the new item, not before it.
        startCreating(onCreated);
      } else {
        toast.error(result.error ?? CREATE_FAILED_MESSAGE);
      }
    } catch (error) {
      // A signed-out caller's redirect arrives here too, and must go on. A
      // rejection left in the transition would replace the page with an
      // error page, the root one or `(app)/error.tsx`, by where this mounts.
      unstable_rethrow(error);
      toast.error(CREATE_FAILED_MESSAGE);
    }
  });
}
