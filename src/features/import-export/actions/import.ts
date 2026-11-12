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
import type { ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const PRO_ONLY = "Import is a Pro feature";
const RATE_LIMITED = "Too many import requests. Wait a minute and try again.";
const UNAVAILABLE = "Import is unavailable right now. Please try again later.";

function failure(error: string): ActionResult<null> {
  return { success: false, data: null, error };
}

// One batch, one service call. Nothing is refreshed here: the browser sends
// the batches one after another and refreshes the page once, at the end.
async function runBatch<T>(
  records: unknown,
  run: (userId: string, records: unknown[]) => Promise<ImportBatchResult<T>>,
): Promise<ActionResult<T | null>> {
  const parsed = importBatchSchema.safeParse(records);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await run(userId, parsed.data);
    if (result.status === "forbidden") return failure(PRO_ONLY);
    if (result.status === "rate-limited") return failure(RATE_LIMITED);
    return { success: true, error: null, data: result.data };
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return failure(UNAVAILABLE);
    await logger.error("Importing a batch failed", { error, userId });
    return failure(GENERIC_ERROR);
  }
}

export async function importCollections(
  records: unknown,
): Promise<ActionResult<CollectionImportData | null>> {
  return runBatch(records, importUserCollections);
}

export async function importItems(
  records: unknown,
): Promise<ActionResult<ImportSummary | null>> {
  return runBatch(records, importUserItems);
}
