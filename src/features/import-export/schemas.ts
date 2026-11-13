import { z } from "zod";

import { createCollectionSchema } from "@/features/collections/schemas";
import { EXPORT_VERSION } from "@/features/import-export/domain/export-format";
import {
  isImportRecord,
  toCreateItemCandidate,
} from "@/features/import-export/domain/import-records";
import {
  IMPORT_BATCH_MAX_RECORDS,
  IMPORT_MAX_COLLECTIONS,
  IMPORT_MAX_ITEMS,
} from "@/features/import-export/domain/limits";
import {
  editableFields,
  isCreatableType,
} from "@/features/items/domain/item-fields";
import {
  createItemSchema,
  type CreateItemInput,
} from "@/features/items/schemas";
import { firstIssueMessage } from "@/lib/validation";

const UNSUPPORTED_VERSION =
  "This file is from a version of DevStash this app cannot read";
const NOT_AN_EXPORT = "This is not a DevStash export file";

// The envelope only: the version, and that both lists are there and within the
// caps. Each record is checked on its own on the server, so one record outside
// today's limits fails alone instead of the whole file (ADR 0020).
export const importFileSchema = z.object(
  {
    version: z.literal(EXPORT_VERSION, UNSUPPORTED_VERSION),
    collections: z
      .array(z.unknown(), NOT_AN_EXPORT)
      .max(
        IMPORT_MAX_COLLECTIONS,
        `A file can hold up to ${IMPORT_MAX_COLLECTIONS} collections`,
      ),
    items: z
      .array(z.unknown(), NOT_AN_EXPORT)
      .max(IMPORT_MAX_ITEMS, `A file can hold up to ${IMPORT_MAX_ITEMS} items`),
  },
  NOT_AN_EXPORT,
);

export type ImportFile = z.infer<typeof importFileSchema>;

export type ParsedImportFile =
  { success: true; data: ImportFile } | { success: false; error: string };

// The text of the chosen file: JSON, then the envelope. The version is read
// first, so a file of a newer version says so even when its shape changed.
export function parseImportFile(text: string): ParsedImportFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { success: false, error: "This file is not valid JSON" };
  }
  if (isImportRecord(json) && json.version !== EXPORT_VERSION) {
    return { success: false, error: UNSUPPORTED_VERSION };
  }
  const parsed = importFileSchema.safeParse(json);
  return parsed.success
    ? { success: true, data: parsed.data }
    : { success: false, error: firstIssueMessage(parsed.error) };
}

// What one Server Action takes: a batch of records, each still unchecked.
export const importBatchSchema = z
  .array(z.unknown(), "Invalid import batch")
  .min(1, "Invalid import batch")
  .max(IMPORT_BATCH_MAX_RECORDS, "Invalid import batch");

const importedCollectionSchema = createCollectionSchema.extend({
  id: z.string("The collection has no id").min(1).max(100),
});

export type ImportedCollection = z.infer<typeof importedCollectionSchema>;

export type ParsedRecord<T> =
  { kind: "ok"; data: T } | { kind: "invalid"; error: string };

export function parseImportedCollection(
  record: unknown,
): ParsedRecord<ImportedCollection> {
  const parsed = importedCollectionSchema.safeParse(record);
  return parsed.success
    ? { kind: "ok", data: parsed.data }
    : { kind: "invalid", error: firstIssueMessage(parsed.error) };
}

// An item record through the same schema as the create dialog. A file or image
// item has no bytes to store, so it is counted apart (ADR 0019).
export function parseImportedItem(
  record: unknown,
): ParsedRecord<CreateItemInput> | { kind: "file" } {
  if (!isImportRecord(record)) {
    return { kind: "invalid", error: "The record is not an item" };
  }
  const typeName = record.type;
  if (typeof typeName !== "string" || !isCreatableType(typeName)) {
    return { kind: "invalid", error: "Unknown item type" };
  }
  if (editableFields(typeName).file) return { kind: "file" };

  const parsed = createItemSchema.safeParse(toCreateItemCandidate(record));
  return parsed.success
    ? { kind: "ok", data: parsed.data }
    : { kind: "invalid", error: firstIssueMessage(parsed.error) };
}
