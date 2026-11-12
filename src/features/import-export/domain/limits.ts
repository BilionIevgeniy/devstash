// How large a file the browser reads for an import.
export const IMPORT_FILE_MAX_BYTES = 5 * 1024 * 1024;
export const IMPORT_FILE_MAX_MB = 5;

// Records one file may hold, far above a real account.
export const IMPORT_MAX_ITEMS = 10_000;
export const IMPORT_MAX_COLLECTIONS = 1_000;

// One batch goes to one Server Action, whose body may be 1 MB by default: half
// of that leaves room for the encoding. A record alone over the limit is not
// sent (the content limit keeps a real one far below it).
export const IMPORT_BATCH_MAX_RECORDS = 50;
export const IMPORT_BATCH_MAX_BYTES = 512 * 1024;

const MINUTE_SECONDS = 60;

// The export reads every item of the account, so once a minute.
export const EXPORT_BY_USER = {
  name: "export:user",
  limit: 1,
  windowSeconds: MINUTE_SECONDS,
} as const;

// The batches of the largest file the browser takes: cut by count, plus at
// most one more cut per 512 KB of the file in each list.
export const IMPORT_MAX_BATCHES =
  Math.ceil(IMPORT_MAX_ITEMS / IMPORT_BATCH_MAX_RECORDS) +
  Math.ceil(IMPORT_MAX_COLLECTIONS / IMPORT_BATCH_MAX_RECORDS) +
  2 * Math.ceil(IMPORT_FILE_MAX_BYTES / IMPORT_BATCH_MAX_BYTES);

// Every batch counts, a batch of duplicates too, so the window must take a
// whole file: a rerun of a large import answers its duplicate batches in
// milliseconds and would otherwise stop at the same batch every time. Still
// a ceiling for a script calling the action (ADR 0020).
export const IMPORT_BY_USER = {
  name: "import:user",
  limit: IMPORT_MAX_BATCHES,
  windowSeconds: MINUTE_SECONDS,
} as const;
