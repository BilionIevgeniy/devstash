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
import {
  fail,
  GENERIC_ERROR_MESSAGE,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { RateLimitUnavailableError } from "@/lib/rate-limit";
import { firstIssueMessage } from "@/lib/validation";

const PRO_ONLY = "Import is a Pro feature";
const RATE_LIMITED = "Too many import requests. Wait a minute and try again.";
const UNAVAILABLE = "Import is unavailable right now. Please try again later.";

// One batch, one service call. Nothing is refreshed here: the browser sends
// the batches one after another and refreshes the page once, at the end.
async function runBatch<T>(
  records: unknown,
  run: (userId: string, records: unknown[]) => Promise<ImportBatchResult<T>>,
): Promise<ActionResult<T>> {
  const parsed = importBatchSchema.safeParse(records);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await run(userId, parsed.data);
    if (result.status === "forbidden") return fail(PRO_ONLY);
    if (result.status === "rate-limited") return fail(RATE_LIMITED);
    return ok(result.data);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return fail(UNAVAILABLE);
    await logger.error("Importing a batch failed", { error, userId });
    return fail(GENERIC_ERROR_MESSAGE);
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
