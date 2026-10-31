import "server-only";

import { signItemFile } from "@/features/items/_internal/services/file-urls";
import { getUploadItemsByType } from "@/features/items/queries";
import type { FileListItem, UploadItemRecord } from "@/features/items/types";

// The records come from a query scoped by userId, so every key is the caller's
// own; signing is local and makes no request to R2. The key itself never
// leaves the server.
async function toFileListItem(
  { fileKey, fileName, fileSize, ...item }: UploadItemRecord,
  now: Date,
): Promise<FileListItem> {
  if (!fileKey) return { ...item, file: null };

  const file = await signItemFile(fileKey, fileName, now);
  return { ...item, file: { ...file, size: fileSize ?? 0 } };
}

export async function getUserFileListItems(
  userId: string,
  typeId: string,
): Promise<FileListItem[]> {
  const records = await getUploadItemsByType(userId, typeId);
  const now = new Date();
  return Promise.all(records.map((record) => toFileListItem(record, now)));
}
