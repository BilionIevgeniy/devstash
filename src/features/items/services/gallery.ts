import "server-only";

import { getUploadItemsOfType } from "@/features/items/_internal/queries/type-list";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import type { ItemListFilter } from "@/features/items/domain/list/list-params";
import type { GalleryItem, UploadItemRecord } from "@/features/items/types";
import { toRowFields } from "@/features/items/domain/row-fields";

// The records come from a query scoped by userId, so every key is the caller's
// own; signing is local and makes no request to R2. The thumbnail is the
// drawer's view URL, so opening a card reuses the cached image. The key itself
// never leaves the server.
export async function toGalleryItem(
  record: UploadItemRecord,
  now: Date,
): Promise<GalleryItem> {
  const row = toRowFields(record);
  if (!record.fileKey) return { ...row, imageUrl: null };

  const { viewUrl } = await signItemFile(record.fileKey, record.fileName, now);
  return { ...row, imageUrl: viewUrl };
}

export async function getUserGalleryItems(
  userId: string,
  typeId: string,
  filter: ItemListFilter,
  skip: number,
  take: number,
): Promise<GalleryItem[]> {
  const items = await getUploadItemsOfType(userId, typeId, filter, skip, take);
  const now = new Date();
  return Promise.all(items.map((item) => toGalleryItem(item, now)));
}
