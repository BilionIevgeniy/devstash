import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import { getCollectionIdsByName } from "@/features/collections/queries/import";
import { createUserCollection } from "@/features/collections/services/collection";
import {
  emptyImportSummary,
  itemDuplicateKey,
  recordLabel,
} from "@/features/import-export/domain/import-records";
import { IMPORT_BY_USER } from "@/features/import-export/domain/limits";
import {
  parseImportedCollection,
  parseImportedItem,
} from "@/features/import-export/schemas";
import type {
  CollectionImportData,
  ImportSummary,
} from "@/features/import-export/types";
import { getItemIdentities } from "@/features/items/queries/import";
import { createUserItem } from "@/features/items/services/create-item";
import type { OperationResult } from "@/lib/action-result";
import { toErrorRef, type ErrorRef } from "@/i18n/error-codes";
import { logger } from "@/lib/logger";
import { consumeRateLimit } from "@/lib/rate-limit";

export type ImportBatchResult<T> =
  | { status: "ok"; data: T }
  | { status: "forbidden" }
  | { status: "rate-limited"; reset: number };

type Refusal = Exclude<ImportBatchResult<never>, { status: "ok" }>;

// Pro only; every batch counts against the per-user limit. A
// RateLimitUnavailableError propagates to the action.
async function refuseImport(userId: string): Promise<Refusal | null> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return { status: "forbidden" };
  const limit = await consumeRateLimit(IMPORT_BY_USER, userId);
  return limit.success ? null : { status: "rate-limited", reset: limit.reset };
}

// One create through the owner's service. A refusal is the record's failure;
// an unexpected error is logged and fails this record only, the batch goes on.
async function createRecord(
  userId: string,
  create: () => Promise<OperationResult<{ id: string }>>,
): Promise<{ id: string } | { error: ErrorRef }> {
  try {
    const result = await create();
    if (result.success) return { id: result.data.id };
    return { error: toErrorRef(result) };
  } catch (error) {
    await logger.error("Importing a record failed", { error, userId });
    return { error: { error: "importRecordFailed" } };
  }
}

// A collection whose name the account already has (the oldest of that name)
// is not created again: its items go into the one that is there.
export async function importUserCollections(
  userId: string,
  records: unknown[],
): Promise<ImportBatchResult<CollectionImportData>> {
  const refusal = await refuseImport(userId);
  if (refusal) return refusal;

  const parsed = records.map(parseImportedCollection);
  const names = parsed.flatMap((p) => (p.kind === "ok" ? [p.data.name] : []));
  const known = await getCollectionIdsByName(userId, [...new Set(names)]);
  const summary = emptyImportSummary();
  const idMap: Record<string, string> = {};

  for (const [index, record] of parsed.entries()) {
    const title = recordLabel(records[index]);
    if (record.kind === "invalid") {
      summary.failed.push({ title, reason: record.reason });
      continue;
    }
    const { id, name, description } = record.data;
    const existing = known.get(name);
    if (existing) {
      idMap[id] = existing;
      summary.duplicates += 1;
      continue;
    }
    const created = await createRecord(userId, () =>
      createUserCollection(userId, { name, description }),
    );
    if ("error" in created) {
      summary.failed.push({ title, reason: created.error });
      continue;
    }
    idMap[id] = created.id;
    known.set(name, created.id);
    summary.created += 1;
  }
  return { status: "ok", data: { summary, idMap } };
}

// An item the account already has (itemDuplicateKey), in the database or
// earlier in this batch, is skipped, so running the same import again creates
// nothing new.
export async function importUserItems(
  userId: string,
  records: unknown[],
): Promise<ImportBatchResult<ImportSummary>> {
  const refusal = await refuseImport(userId);
  if (refusal) return refusal;

  const parsed = records.map(parseImportedItem);
  const titles = parsed.flatMap((p) => (p.kind === "ok" ? [p.data.title] : []));
  const identities = await getItemIdentities(userId, [...new Set(titles)]);
  const known = new Set(identities.map(itemDuplicateKey));
  const summary = emptyImportSummary();

  for (const [index, record] of parsed.entries()) {
    const title = recordLabel(records[index]);
    if (record.kind === "file") {
      summary.files += 1;
      continue;
    }
    if (record.kind === "invalid") {
      summary.failed.push({ title, reason: record.reason });
      continue;
    }
    const key = itemDuplicateKey({
      ...record.data,
      content: record.data.content ?? null,
      url: record.data.url ?? null,
    });
    if (known.has(key)) {
      summary.duplicates += 1;
      continue;
    }
    const created = await createRecord(userId, () =>
      createUserItem(userId, record.data),
    );
    if ("error" in created) {
      summary.failed.push({ title, reason: created.error });
      continue;
    }
    known.add(key);
    summary.created += 1;
  }
  return { status: "ok", data: summary };
}
