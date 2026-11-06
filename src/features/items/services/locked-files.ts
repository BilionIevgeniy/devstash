import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import {
  countFileItems,
  getFileItemRecords,
} from "@/features/items/_internal/queries";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import type { LockedFile, LockedFileRecord } from "@/features/items/types";
import type { Paginated } from "@/lib/pagination";

const NOTHING_LOCKED: Paginated<LockedFile> = {
  items: [],
  totalCount: 0,
  page: 1,
  totalPages: 1,
};

// A user on Pro has uploads, but none of them is locked.
export async function getUserLockedFileCount(userId: string): Promise<number> {
  const { isPro } = await getEntitlements(userId);
  return isPro ? 0 : countFileItems(userId);
}

async function toLockedFile(
  { id, title, fileKey, fileName, fileSize }: LockedFileRecord,
  now: Date,
): Promise<LockedFile[]> {
  if (!fileKey) return [];

  const { name, downloadUrl } = await signItemFile(fileKey, fileName, now);
  return [{ id, title, fileName: name, size: fileSize ?? 0, downloadUrl }];
}

// The one place a Free user gets a signed URL: a download, so their files are
// not held back behind a payment. The view URL stays here, since opening a
// file in the app is what Pro gives.
export async function getUserLockedFiles(
  userId: string,
  page: number,
): Promise<Paginated<LockedFile>> {
  const { isPro } = await getEntitlements(userId);
  if (isPro) return NOTHING_LOCKED;

  const { items, ...position } = await getFileItemRecords(userId, page);
  const now = new Date();
  const files = await Promise.all(items.map((item) => toLockedFile(item, now)));
  return { ...position, items: files.flat() };
}
