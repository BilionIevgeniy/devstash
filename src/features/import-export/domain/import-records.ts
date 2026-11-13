import { editableFields } from "@/features/items/domain/item-fields";
import type { ItemIdentity } from "@/features/items/types";
import type { ImportSummary } from "@/features/import-export/types";

// The records of an import file are checked one by one on the server, so here
// they are plain JSON values, and every read of a field is defensive.

export type ImportRecord = Record<string, unknown>;

export function isImportRecord(value: unknown): value is ImportRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// The name a summary shows for a record: its title or name, or null for one
// without, which the summary words as "Untitled".
export function recordLabel(record: unknown): string | null {
  if (!isImportRecord(record)) return null;
  const label = record.title ?? record.name;
  return typeof label === "string" && label.trim() !== "" ? label.trim() : null;
}

// The type an item record names, if any.
export function recordTypeName(record: unknown): string | null {
  return isImportRecord(record) && typeof record.type === "string"
    ? record.type
    : null;
}

// Points an item's collections at the ids they have in this account. An id
// the map does not know (a collection that failed) is dropped, so the item is
// still created. A record that is not an object is left for the server.
export function remapCollectionIds(
  record: unknown,
  idMap: Readonly<Record<string, string>>,
): unknown {
  if (!isImportRecord(record) || !Array.isArray(record.collectionIds)) {
    return record;
  }
  const collectionIds = record.collectionIds.flatMap((id) =>
    typeof id === "string" && Object.hasOwn(idMap, id) ? [idMap[id]] : [],
  );
  return { ...record, collectionIds };
}

// The fields of an exported item in the shape the create schema reads. A
// missing optional field is null; the schema decides the rest.
export function toCreateItemCandidate(record: ImportRecord) {
  return {
    typeName: record.type,
    title: record.title,
    description: record.description ?? null,
    content: record.content ?? null,
    url: record.url ?? null,
    language: record.language ?? null,
    tags: record.tags ?? [],
    collectionIds: record.collectionIds ?? [],
  };
}

// Two items are the same when their type, title and the text their type stores
// match: two snippets with one title but different code are both kept.
export function itemDuplicateKey(item: ItemIdentity): string {
  const fields = editableFields(item.typeName);
  return JSON.stringify([
    item.typeName,
    item.title,
    fields.content ? item.content : null,
    fields.url ? item.url : null,
  ]);
}

export function emptyImportSummary(): ImportSummary {
  return { created: 0, duplicates: 0, files: 0, failed: [] };
}

export function addImportSummaries(
  a: ImportSummary,
  b: ImportSummary,
): ImportSummary {
  return {
    created: a.created + b.created,
    duplicates: a.duplicates + b.duplicates,
    files: a.files + b.files,
    failed: [...a.failed, ...b.failed],
  };
}
