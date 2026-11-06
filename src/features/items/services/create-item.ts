import "server-only";

import {
  FREE_ITEM_LIMIT,
  withinFreeItemLimit,
} from "@/features/billing/domain/limits";
import { getEntitlements } from "@/features/billing/queries";
import type { FileKind } from "@/features/files/domain/file-rules";
import { confirmUpload } from "@/features/files/services/objects";
import { getItemTypeByName } from "@/features/item-types/queries";
import {
  collectionLinks,
  hasPrismaCode,
  isRecordNotFound,
  tagLinks,
  UNIQUE_VIOLATION_CODE,
} from "@/features/items/_internal/services/item-writes";
import {
  contentTypeFor,
  editableFields,
} from "@/features/items/domain/item-fields";
import type { CreateItemInput } from "@/features/items/schemas";
import type { Prisma } from "@/generated/prisma/client";
import type { OperationResult } from "@/lib/action-result";
import { LOCKED_TRANSACTION, lockForTransaction } from "@/lib/advisory-lock";
import { prisma } from "@/lib/prisma";

const INVALID_ITEM_TYPE = "Invalid item type";
const PRO_ONLY = "Files and images are a Pro feature";
const FILE_MISSING = "Upload the file first";
const FILE_ALREADY_SAVED = "This file is already saved on another item";
const COLLECTION_NOT_FOUND = "One of the collections no longer exists";
const ITEM_LIMIT_REACHED = `You have reached the Free plan's limit of ${FREE_ITEM_LIMIT} items. Upgrade to Pro for unlimited items.`;

export interface CreateItemResult extends OperationResult {
  data: { id: string } | null;
}

type FileColumns =
  | { error: string }
  | { columns: { fileKey: string; fileName: string; fileSize: number } };

// A file or image item needs Pro and an upload that really is in R2 under the
// caller's prefix, within the size and of the type of its kind. The size
// stored is the one R2 reports, not the one the browser declared.
async function confirmFileColumns(
  userId: string,
  isPro: boolean,
  kind: FileKind,
  file: CreateItemInput["file"],
): Promise<FileColumns> {
  if (!isPro) return { error: PRO_ONLY };
  if (!file) return { error: FILE_MISSING };

  const confirmed = await confirmUpload(userId, file.key, kind);
  if (!confirmed.success || !confirmed.data) {
    return { error: confirmed.error ?? FILE_MISSING };
  }
  return {
    columns: {
      fileKey: file.key,
      fileName: file.name,
      fileSize: confirmed.data.size,
    },
  };
}

// Only the fields its type has are stored, so a stray language on a note, or a
// file on a snippet, never lands in the row.
function itemData(
  userId: string,
  typeId: string,
  input: CreateItemInput,
  fileColumns: object,
): Prisma.ItemUncheckedCreateInput {
  const { typeName, title, description, content, language, url } = input;
  const fields = editableFields(typeName);
  return {
    userId,
    typeId,
    contentType: contentTypeFor(typeName),
    title,
    description,
    ...(fields.content && { content }),
    ...(fields.language && { language }),
    ...(fields.url && { url }),
    ...fileColumns,
    tags: { create: tagLinks(userId, input.tags) },
    collections: { create: collectionLinks(userId, input.collectionIds) },
  };
}

// Pro skips the lock and the count. Two parallel creates of a Free user wait
// here, so they cannot both pass the limit.
async function insertItem(
  userId: string,
  isPro: boolean,
  data: Prisma.ItemUncheckedCreateInput,
): Promise<{ id: string } | null> {
  const select = { id: true };
  if (isPro) return prisma.item.create({ data, select });

  return prisma.$transaction(async (tx) => {
    await lockForTransaction(tx, `free-items:${userId}`);
    const count = await tx.item.count({ where: { userId } });
    if (!withinFreeItemLimit(count)) return null;
    return tx.item.create({ data, select });
  }, LOCKED_TRANSACTION);
}

// The type is looked up by name among the system types.
//
// An upload that is confirmed but not saved (a failure below, or a dialog
// closed after the upload) stays in R2 until the account is purged: deleting
// it here would break the retry, since the form still holds its key.
export async function createUserItem(
  userId: string,
  input: CreateItemInput,
): Promise<CreateItemResult> {
  const type = await getItemTypeByName(input.typeName);
  if (!type) return { success: false, error: INVALID_ITEM_TYPE, data: null };

  const { isPro } = await getEntitlements(userId);
  const { file: fileKind } = editableFields(input.typeName);
  let fileColumns = {};
  if (fileKind) {
    const file = await confirmFileColumns(userId, isPro, fileKind, input.file);
    if ("error" in file)
      return { success: false, error: file.error, data: null };
    fileColumns = file.columns;
  }

  try {
    const data = itemData(userId, type.id, input, fileColumns);
    const item = await insertItem(userId, isPro, data);
    if (!item) {
      return { success: false, error: ITEM_LIMIT_REACHED, data: null };
    }
    return { success: true, error: null, data: item };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return { success: false, error: COLLECTION_NOT_FOUND, data: null };
    }
    // fileKey is the only unique column a file item can collide on: the same
    // upload sent twice, after a lost response.
    if (fileKind && hasPrismaCode(error, UNIQUE_VIOLATION_CODE)) {
      return { success: false, error: FILE_ALREADY_SAVED, data: null };
    }
    throw error;
  }
}
