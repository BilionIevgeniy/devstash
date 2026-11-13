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
import { toErrorRef, type ErrorCode, type ErrorRef } from "@/i18n/error-codes";
import { fail, type Failure } from "@/lib/action-result";
import { firstIssue } from "@/lib/validation";

const UNSUPPORTED_VERSION = "unsupportedExportVersion" satisfies ErrorCode;
const NOT_AN_EXPORT = "notAnExport" satisfies ErrorCode;

// The envelope only: the version, and that both lists are there and within the
// caps. Each record is checked on its own on the server, so one record outside
// today's limits fails alone instead of the whole file (ADR 0020).
export const importFileSchema = z.object(
  {
    version: z.literal(EXPORT_VERSION, UNSUPPORTED_VERSION),
    collections: z
      .array(z.unknown(), NOT_AN_EXPORT)
      .max(IMPORT_MAX_COLLECTIONS, "importTooManyCollections"),
    items: z
      .array(z.unknown(), NOT_AN_EXPORT)
      .max(IMPORT_MAX_ITEMS, "importTooManyItems"),
  },
  NOT_AN_EXPORT,
);

export type ImportFile = z.infer<typeof importFileSchema>;

export type ParsedImportFile = { success: true; data: ImportFile } | Failure;

// The text of the chosen file: JSON, then the envelope. The version is read
// first, so a file of a newer version says so even when its shape changed.
export function parseImportFile(text: string): ParsedImportFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail("invalidJson");
  }
  if (isImportRecord(json) && json.version !== EXPORT_VERSION) {
    return fail(UNSUPPORTED_VERSION);
  }
  const parsed = importFileSchema.safeParse(json);
  return parsed.success
    ? { success: true, data: parsed.data }
    : firstIssue(parsed.error);
}

// What one Server Action takes: a batch of records, each still unchecked.
export const importBatchSchema = z
  .array(z.unknown(), "invalidImportBatch")
  .min(1, "invalidImportBatch")
  .max(IMPORT_BATCH_MAX_RECORDS, "invalidImportBatch");

const importedCollectionSchema = createCollectionSchema.extend({
  id: z
    .string("collectionHasNoId")
    .min(1, "collectionHasNoId")
    .max(100, "collectionHasNoId"),
});

export type ImportedCollection = z.infer<typeof importedCollectionSchema>;

// The code of a refused record and its params, without the result envelope:
// it goes into the import summary.
function recordIssue(error: z.ZodError): ErrorRef {
  return toErrorRef(firstIssue(error));
}

export type ParsedRecord<T> =
  { kind: "ok"; data: T } | { kind: "invalid"; reason: ErrorRef };

export function parseImportedCollection(
  record: unknown,
): ParsedRecord<ImportedCollection> {
  const parsed = importedCollectionSchema.safeParse(record);
  return parsed.success
    ? { kind: "ok", data: parsed.data }
    : { kind: "invalid", reason: recordIssue(parsed.error) };
}

// An item record through the same schema as the create dialog. A file or image
// item has no bytes to store, so it is counted apart (ADR 0019).
export function parseImportedItem(
  record: unknown,
): ParsedRecord<CreateItemInput> | { kind: "file" } {
  if (!isImportRecord(record)) {
    return { kind: "invalid", reason: { error: "recordNotAnItem" } };
  }
  const typeName = record.type;
  if (typeof typeName !== "string" || !isCreatableType(typeName)) {
    return { kind: "invalid", reason: { error: "unknownItemType" } };
  }
  if (editableFields(typeName).file) return { kind: "file" };

  const parsed = createItemSchema.safeParse(toCreateItemCandidate(record));
  return parsed.success
    ? { kind: "ok", data: parsed.data }
    : { kind: "invalid", reason: recordIssue(parsed.error) };
}
