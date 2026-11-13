"use server";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { importBatchSchema } from "@/features/import-export/schemas";
import {
  importUserCollections,
  importUserItems,
  type ImportBatchResult,
} from "@/features/import-export/services/import";
import type {
  CollectionImportData,
  ImportSummary,
} from "@/features/import-export/types";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { RateLimitUnavailableError } from "@/lib/rate-limit";
import { firstIssue } from "@/lib/validation";

// One batch, one service call. Nothing is refreshed here: the browser sends
// the batches one after another and refreshes the page once, at the end.
async function runBatch<T>(
  records: unknown,
  run: (userId: string, records: unknown[]) => Promise<ImportBatchResult<T>>,
): Promise<ActionResult<T>> {
  const parsed = importBatchSchema.safeParse(records);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await run(userId, parsed.data);
    if (result.status === "forbidden") return fail("importProOnly");
    if (result.status === "rate-limited") return fail("importRateLimited");
    return ok(result.data);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError)
      return fail("importUnavailable");
    await logger.error("Importing a batch failed", { error, userId });
    return fail("generic");
  }
}

export async function importCollections(
  records: unknown,
): Promise<ActionResult<CollectionImportData>> {
  return runBatch(records, importUserCollections);
}

export async function importItems(
  records: unknown,
): Promise<ActionResult<ImportSummary>> {
  return runBatch(records, importUserItems);
}
