import "server-only";

import {
  getItemDetail,
  getItemDetailOfType,
} from "@/features/items/_internal/queries";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import { userCanUseType } from "@/features/items/services/type-access";
import type { ItemDetail, ItemDetailRecord } from "@/features/items/types";

export type OpenItemResult =
  | { status: "ok"; item: ItemDetail }
  | { status: "locked" }
  | { status: "missing" };

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

  const file = await signItemFile(fileKey, fileName, new Date());
  return { ...item, file: { ...file, size: fileSize ?? 0 } };
}

export async function getUserItemDetail(
  userId: string,
  itemId: string,
): Promise<ItemDetail | null> {
  const record = await getItemDetail(userId, itemId);
  return record ? toItemDetail(record) : null;
}

// What a user may open: the plan is checked on the record's real type, before
// anything is signed. The type in a drawer's URL is the page behind it.
export async function openUserItem(
  userId: string,
  itemId: string,
): Promise<OpenItemResult> {
  const record = await getItemDetail(userId, itemId);
  if (!record) return { status: "missing" };
  if (!(await userCanUseType(userId, record.type.name))) {
    return { status: "locked" };
  }
  return { status: "ok", item: await toItemDetail(record) };
}

// The full item page carries the type in the URL: an item of another type is
// not found there, the same as a missing one.
export async function getUserItemDetailOfType(
  userId: string,
  itemId: string,
  typeName: string,
): Promise<ItemDetail | null> {
  const record = await getItemDetailOfType(userId, itemId, typeName);
  return record ? toItemDetail(record) : null;
}
