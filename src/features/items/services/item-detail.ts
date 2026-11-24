import "server-only";

import {
  getItemDetail,
  getItemDetailOfType,
} from "@/features/items/_internal/queries/item-detail";
import { signItemFile } from "@/features/items/_internal/services/file-urls";
import { getEntitlements } from "@/features/billing/queries";
import { systemTypeNameForSlug } from "@/features/item-types/domain/item-type";
import { canUseType } from "@/features/items/domain/item-fields";
import { userCanUseType } from "@/features/items/services/type-access";
import { getItemEditMode } from "@/features/items/services/text-access";
import type {
  ItemDetail,
  ItemDetailRecord,
  ItemEditMode,
} from "@/features/items/types";

export type OpenItemResult =
  | {
      status: "ok";
      item: ItemDetail;
      canUseAi: boolean;
      editMode: ItemEditMode;
    }
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
// anything is signed. The type in a drawer's URL is the page behind it. The
// plan is read once for both answers: cache() shares nothing in a route
// handler, where GET /api/items/[id] calls this.
export async function openUserItem(
  userId: string,
  itemId: string,
): Promise<OpenItemResult> {
  const record = await getItemDetail(userId, itemId);
  if (!record) return { status: "missing" };

  const { isPro } = await getEntitlements(userId);
  if (!canUseType(record.type.name, isPro)) return { status: "locked" };
  return {
    status: "ok",
    item: await toItemDetail(record),
    canUseAi: isPro,
    editMode: await getItemEditMode(userId),
  };
}

// What the full item page may open, with the type in its URL: an item of
// another type is missing there, the same as one that does not exist. A Pro
// system type is refused before any read, so a Free user learns nothing about
// the id; a custom type opens on every plan (its items stay readable after a
// downgrade, ADR 0032).
export async function openUserItemOfType(
  userId: string,
  itemId: string,
  typeSlug: string,
): Promise<OpenItemResult> {
  const systemName = systemTypeNameForSlug(typeSlug);
  if (systemName && !(await userCanUseType(userId, systemName))) {
    return { status: "locked" };
  }

  // cache() shares the plan's read with the check above.
  const [record, { isPro }, editMode] = await Promise.all([
    getItemDetailOfType(userId, itemId, typeSlug),
    getEntitlements(userId),
    getItemEditMode(userId),
  ]);
  if (!record) return { status: "missing" };
  return {
    status: "ok",
    item: await toItemDetail(record),
    canUseAi: isPro,
    editMode,
  };
}
