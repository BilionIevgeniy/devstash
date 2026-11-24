import "server-only";

import { getUploadItemsOfType } from "@/features/items/_internal/queries/type-list";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import { toRowFields } from "@/features/items/domain/row-fields";
import type { ItemListFilter } from "@/features/items/domain/list/list-params";
import type { FileListItem, UploadItemRecord } from "@/features/items/types";

// The records come from a query scoped by userId, so every key is the caller's
// own; signing is local and makes no request to R2. The key itself never
// leaves the server.
export async function toFileListItem(
  record: UploadItemRecord,
  now: Date,
): Promise<FileListItem> {
  const row = toRowFields(record);
  if (!record.fileKey) return { ...row, file: null };

  const file = await signItemFile(record.fileKey, record.fileName, now);
  return { ...row, file: { ...file, size: record.fileSize ?? 0 } };
}

export async function getUserFileListItems(
  userId: string,
  typeId: string,
  filter: ItemListFilter,
  skip: number,
  take: number,
): Promise<FileListItem[]> {
  const items = await getUploadItemsOfType(userId, typeId, filter, skip, take);
  const now = new Date();
  return Promise.all(items.map((item) => toFileListItem(item, now)));
}
