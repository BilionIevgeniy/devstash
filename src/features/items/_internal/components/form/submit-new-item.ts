import "client-only";

import type { SubmitRun } from "@/components/common/hooks/use-submit-dialog";
import type { UploadedFile } from "@/features/files/types";
import { createItem } from "@/features/items/actions/item";
import type { ItemChange } from "@/features/items/components/item-queries";
import type { AiGeneratedClaims } from "@/features/items/domain/ai-marks";
import {
  typeFieldValues,
  type ItemFormValues,
} from "@/features/items/domain/item-changes";
import {
  parseTagInput,
  type EditableFields,
} from "@/features/items/domain/item-fields";

export interface NewItemSubmission {
  typeName: string;
  fields: EditableFields;
  values: ItemFormValues;
  /** What the form claims came from the AI unchanged (ADR 0027). */
  aiGenerated: AiGeneratedClaims;
  upload: UploadedFile | null;
  /** Stops a form the server would refuse, at the field (useItemFormCheck). */
  rejectInvalid: (values: ItemFormValues) => boolean;
  run: SubmitRun;
  /** The cache follows the new item (useSyncItemQueries of the dialog). */
  syncItems: (change: ItemChange) => Promise<void>;
  /** Called in the commit that brings the refreshed page with the new item. */
  onCreated: () => void;
}

// Only the fields of the chosen type are sent; the others keep their input in
// case the type is switched back.
function createPayload({
  typeName,
  fields,
  values,
  aiGenerated,
  upload,
}: Pick<
  NewItemSubmission,
  "typeName" | "fields" | "values" | "aiGenerated" | "upload"
>) {
  return {
    typeName,
    title: values.title,
    description: values.description,
    tags: parseTagInput(values.tags),
    collectionIds: values.collectionIds,
    ...typeFieldValues(fields, values),
    ...(fields.file &&
      upload && { file: { key: upload.key, name: upload.fileName } }),
    aiGenerated,
  };
}

// The create dialog's submit: a field the server would refuse stops here, the
// rest goes to the action through the dialog's run (useSubmitDialog).
export function submitNewItem(submission: NewItemSubmission): void {
  const { values, rejectInvalid, run, syncItems, onCreated } = submission;
  if (rejectInvalid(values)) return;

  run(() => createItem(createPayload(submission)), {
    onSuccess: onCreated,
    failCode: "itemCreateFailed",
    sync: () => syncItems({ kind: "created" }),
  });
}
