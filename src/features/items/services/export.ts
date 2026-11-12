import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import {
  getExportItemRows,
  type ExportItemRow,
} from "@/features/items/_internal/queries/export";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import { canUseType } from "@/features/items/domain/item-fields";
import { EXPORT_ITEMS_PAGE_SIZE } from "@/features/items/domain/export";
import type {
  ExportedItem,
  ExportedItemFile,
  ExportedItemPage,
} from "@/features/items/types";

// A file is signed only when the plan gives its type: a Free user with files
// from a past subscription gets them through the locked files page alone.
async function exportedFile(
  {
    type,
    fileKey,
    fileName,
    fileSize,
  }: Pick<ExportItemRow, "type" | "fileKey" | "fileName" | "fileSize">,
  isPro: boolean,
  now: Date,
): Promise<ExportedItemFile | null> {
  if (!fileKey) return null;
  if (!canUseType(type, isPro)) {
    return { name: fileName ?? fileKey, size: fileSize, downloadUrl: null };
  }
  const { name, downloadUrl } = await signItemFile(fileKey, fileName, now);
  return { name, size: fileSize, downloadUrl };
}

async function toExportedItem(
  row: ExportItemRow,
  isPro: boolean,
  now: Date,
): Promise<ExportedItem> {
  const { fileKey, fileName, fileSize, ...item } = row;
  const file = await exportedFile(
    { type: item.type, fileKey, fileName, fileSize },
    isPro,
    now,
  );
  return { ...item, file };
}

// One page of the caller's items for the export, oldest id first. Every page
// of one export passes the same `now`, so all its links share one window
// (exportLinksExpireAt). The plan is read here, not trusted from the caller.
export async function getUserExportItemPage(
  userId: string,
  cursor: string | null,
  now: Date,
): Promise<ExportedItemPage> {
  const [{ rows, nextCursor }, { isPro }] = await Promise.all([
    getExportItemRows(userId, cursor, EXPORT_ITEMS_PAGE_SIZE),
    getEntitlements(userId),
  ]);
  const items = await Promise.all(
    rows.map((row) => toExportedItem(row, isPro, now)),
  );
  return { items, nextCursor };
}
