import "server-only";

import { getUploadItemsByType } from "@/features/items/_internal/queries";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import type { FileListItem, UploadItemRecord } from "@/features/items/types";
import type { Paginated } from "@/lib/pagination";

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
  page: number,
): Promise<Paginated<FileListItem>> {
  const { items, ...position } = await getUploadItemsByType(
    userId,
    typeId,
    page,
  );
  const now = new Date();
  return {
    ...position,
    items: await Promise.all(items.map((item) => toFileListItem(item, now))),
  };
}
