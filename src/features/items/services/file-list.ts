import "server-only";

import { getUploadItemsOfType } from "@/features/items/_internal/queries/type-list";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import type { ItemListFilter } from "@/features/items/domain/list-params";
import type { FileListItem, UploadItemRecord } from "@/features/items/types";

// The records come from a query scoped by userId, so every key is the caller's
// own; signing is local and makes no request to R2. The key itself never
// leaves the server.
export async function toFileListItem(
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
  filter: ItemListFilter,
  skip: number,
  take: number,
): Promise<FileListItem[]> {
  const items = await getUploadItemsOfType(userId, typeId, filter, skip, take);
  const now = new Date();
  return Promise.all(items.map((item) => toFileListItem(item, now)));
}
