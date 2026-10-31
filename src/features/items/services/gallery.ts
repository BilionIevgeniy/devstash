import "server-only";

import { signItemFile } from "@/features/items/_internal/services/file-urls";
import { getGalleryItemsByType } from "@/features/items/queries";
import type { GalleryItem, GalleryItemRecord } from "@/features/items/types";

// The records come from a query scoped by userId, so every key is the caller's
// own; signing is local and makes no request to R2. The thumbnail is the
// drawer's view URL, so opening a card reuses the cached image. The key itself
// never leaves the server.
async function toGalleryItem(
  { fileKey, fileName, ...item }: GalleryItemRecord,
  now: Date,
): Promise<GalleryItem> {
  if (!fileKey) return { ...item, imageUrl: null };

  const { viewUrl } = await signItemFile(fileKey, fileName, now);
  return { ...item, imageUrl: viewUrl };
}

export async function getUserGalleryItems(
  userId: string,
  typeId: string,
): Promise<GalleryItem[]> {
  const records = await getGalleryItemsByType(userId, typeId);
  const now = new Date();
  return Promise.all(records.map((record) => toGalleryItem(record, now)));
}
