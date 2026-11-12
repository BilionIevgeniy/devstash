// A record the import could not create, and why, in the owner's words.
export interface ImportFailure {
  title: string;
  reason: string;
}

// What an import did, summed over its batches.
export interface ImportSummary {
  created: number;
  /** Already in the account: an item of the same type, title and text, a collection of the same name. */
  duplicates: number;
  /** File and image items: their bytes are not in the export (ADR 0019). */
  files: number;
  failed: ImportFailure[];
}

// The answer to a batch of collections: the summary, and the id each exported
// collection has in this account now, so the items can be linked to it.
export interface CollectionImportData {
  summary: ImportSummary;
  idMap: Record<string, string>;
}
