import "server-only";

import { signFileUrls } from "@/features/files/services/objects";
import { getItemDetail, getItemDetailOfType } from "@/features/items/queries";
import type { ItemDetail, ItemDetailRecord } from "@/features/items/types";

// The record comes from a query scoped by userId, so the key is the caller's
// own; signing is local and makes no request to R2. The key itself never
// leaves the server.
async function toItemDetail({
  fileKey,
  fileName,
  fileSize,
  ...item
}: ItemDetailRecord): Promise<ItemDetail> {
  if (!fileKey) return { ...item, file: null };

  const name = fileName ?? fileKey;
  const urls = await signFileUrls(fileKey, name, new Date());
  return { ...item, file: { name, size: fileSize ?? 0, ...urls } };
}

export async function getUserItemDetail(
  userId: string,
  itemId: string,
): Promise<ItemDetail | null> {
  const record = await getItemDetail(userId, itemId);
  return record ? toItemDetail(record) : null;
}

// The item routes carry the type in the URL: an item of another type is not
// found there, the same as a missing one.
export async function getUserItemDetailOfType(
  userId: string,
  itemId: string,
  typeName: string,
): Promise<ItemDetail | null> {
  const record = await getItemDetailOfType(userId, itemId, typeName);
  return record ? toItemDetail(record) : null;
}
