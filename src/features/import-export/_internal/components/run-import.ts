import "client-only";

import {
  importCollections,
  importItems,
} from "@/features/import-export/actions/import";
import { toBatches } from "@/features/import-export/domain/import-batches";
import {
  addImportSummaries,
  emptyImportSummary,
  recordLabel,
  remapCollectionIds,
} from "@/features/import-export/domain/import-records";
import {
  IMPORT_BATCH_MAX_BYTES,
  IMPORT_BATCH_MAX_RECORDS,
} from "@/features/import-export/domain/limits";
import type { ImportFile } from "@/features/import-export/schemas";
import type { ImportSummary } from "@/features/import-export/types";
import type { ErrorRef } from "@/i18n/error-codes";
import { fail, type ActionResult } from "@/lib/action-result";
import { isNavigationError } from "@/lib/navigation-error";

const LIMITS = {
  maxRecords: IMPORT_BATCH_MAX_RECORDS,
  maxBytes: IMPORT_BATCH_MAX_BYTES,
};
const TOO_LARGE: ErrorRef = { error: "importRecordTooLarge" };

export interface ImportRunOptions {
  onProgress: (done: number, total: number) => void;
  /** Checked between batches: the run stops there and reports nothing. */
  isCancelled: () => boolean;
}

/** What a run did, and why it stopped early, if it did. */
export interface ImportRun {
  summary: ImportSummary;
  error: ErrorRef | null;
}

const encoder = new TextEncoder();
const sizeOf = (record: unknown) =>
  encoder.encode(JSON.stringify(record)).length;

// A thrown action (the network, a body over the limit) stops the run like a
// refused one, with the summary of what went through. Null for a session that
// ended: the router is leaving for sign-in, so the run stops like a cancel and
// reports nothing; running it again skips what went through.
async function send<T>(
  action: (batch: unknown[]) => Promise<ActionResult<T>>,
  batch: unknown[],
): Promise<ActionResult<T> | null> {
  try {
    return await action(batch);
  } catch (error) {
    if (isNavigationError(error)) return null;
    return fail("importConnectionLost");
  }
}

// Sends each batch in turn and sums the answers. `toSummary` takes the data of a
// batch and returns its summary. Null when cancelled or leaving for sign-in.
async function sendAll<T>(
  records: readonly unknown[],
  action: (batch: unknown[]) => Promise<ActionResult<T>>,
  toSummary: (data: T) => ImportSummary,
  run: ImportRun,
  options: ImportRunOptions & { progress: { done: number; total: number } },
): Promise<ImportRun | null> {
  const { batches, oversized } = toBatches(records, LIMITS, sizeOf);
  const failed = oversized.map((record) => ({
    title: recordLabel(record, "Untitled record"),
    reason: TOO_LARGE,
  }));
  let summary = { ...run.summary, failed: [...run.summary.failed, ...failed] };
  if (oversized.length > 0) {
    options.progress.done += oversized.length;
    options.onProgress(options.progress.done, options.progress.total);
  }

  for (const batch of batches) {
    if (options.isCancelled()) return null;
    const result = await send(action, batch);
    if (!result) return null;
    if (!result.success) {
      return { summary, error: result };
    }
    summary = addImportSummaries(summary, toSummary(result.data));
    options.progress.done += batch.length;
    options.onProgress(options.progress.done, options.progress.total);
  }
  return { summary, error: null };
}

// Collections first, so each item is sent with the ids its collections have in
// this account (ADR 0020). Stops at the first batch that fails.
export async function runImport(
  file: ImportFile,
  options: ImportRunOptions,
): Promise<ImportRun | null> {
  const total = file.collections.length + file.items.length;
  const progressed = { ...options, progress: { done: 0, total } };
  const idMap: Record<string, string> = {};

  const afterCollections = await sendAll(
    file.collections,
    importCollections,
    (data) => {
      Object.assign(idMap, data.idMap);
      return data.summary;
    },
    { summary: emptyImportSummary(), error: null },
    progressed,
  );
  if (!afterCollections || afterCollections.error) return afterCollections;

  const items = file.items.map((record) => remapCollectionIds(record, idMap));
  return sendAll(
    items,
    importItems,
    (summary) => summary,
    afterCollections,
    progressed,
  );
}
