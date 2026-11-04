import "server-only";

import { getUploadItemsByType } from "@/features/items/_internal/queries";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import type { GalleryItem, UploadItemRecord } from "@/features/items/types";
import type { Paginated } from "@/lib/pagination";

// The records come from a query scoped by userId, so every key is the caller's
// own; signing is local and makes no request to R2. The thumbnail is the
// drawer's view URL, so opening a card reuses the cached image. The key itself
// never leaves the server.
export async function toGalleryItem(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the size is not part of a thumbnail
  { fileKey, fileName, fileSize, ...item }: UploadItemRecord,
  now: Date,
): Promise<GalleryItem> {
  if (!fileKey) return { ...item, imageUrl: null };

  const { viewUrl } = await signItemFile(fileKey, fileName, now);
  return { ...item, imageUrl: viewUrl };
}

export async function getUserGalleryItems(
  userId: string,
  typeId: string,
  page: number,
): Promise<Paginated<GalleryItem>> {
  const { items, ...position } = await getUploadItemsByType(
    userId,
    typeId,
    page,
  );
  const now = new Date();
  return {
    ...position,
    items: await Promise.all(items.map((item) => toGalleryItem(item, now))),
  };
}
