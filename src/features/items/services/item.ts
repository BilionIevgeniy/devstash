import "server-only";

import { getEntitlements } from "@/features/billing/queries";
import type { FileKind } from "@/features/files/domain/file-rules";
import {
  confirmUpload,
  deleteUserObject,
} from "@/features/files/services/objects";
import { getItemTypeByName } from "@/features/item-types/queries";
import {
  contentTypeFor,
  editableFields,
  editableUpdate,
} from "@/features/items/domain/item-fields";
import { getItemFileKey } from "@/features/items/_internal/queries";
import { getItemEditState } from "@/features/items/queries";
import type {
  CreateItemInput,
  UpdateItemInput,
} from "@/features/items/schemas";
import { getUserItemDetail } from "@/features/items/services/item-detail";
import type { ItemDetail } from "@/features/items/types";
import { Prisma } from "@/generated/prisma/client";
import type { OperationResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

const ITEM_NOT_FOUND = "Item not found";
const INVALID_ITEM_TYPE = "Invalid item type";
const PRO_ONLY = "Files and images are a Pro feature";
const FILE_MISSING = "Upload the file first";
const FILE_ALREADY_SAVED = "This file is already saved on another item";
const FILE_DELETE_FAILED = "Couldn't delete the file. Please try again.";
const COLLECTION_NOT_FOUND = "One of the collections no longer exists";
const ITEM_OR_COLLECTION_NOT_FOUND =
  "This item or one of its collections no longer exists";
const RECORD_NOT_FOUND_CODE = "P2025";
const UNIQUE_VIOLATION_CODE = "P2002";

export interface UpdateItemResult extends OperationResult {
  data: ItemDetail | null;
}

export interface CreateItemResult extends OperationResult {
  data: { id: string } | null;
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

function isRecordNotFound(error: unknown): boolean {
  return hasPrismaCode(error, RECORD_NOT_FOUND_CODE);
}

type FileColumns =
  | { error: string }
  | { columns: { fileKey: string; fileName: string; fileSize: number } };

// A file or image item needs Pro and an upload that really is in R2 under the
// caller's prefix, within the size and of the type of its kind. The size
// stored is the one R2 reports, not the one the browser declared.
async function confirmFileColumns(
  userId: string,
  kind: FileKind,
  file: CreateItemInput["file"],
): Promise<FileColumns> {
  const { isPro } = await getEntitlements(userId);
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

// Links to the caller's tags, creating the ones the caller does not have yet.
function tagLinks(userId: string, tags: string[]) {
  return tags.map((name) => ({
    tag: {
      connectOrCreate: {
        where: { userId_name: { userId, name } },
        create: { userId, name },
      },
    },
  }));
}

// Links to the caller's collections. The owner in the connect makes someone
// else's collection fail like a missing one: P2025, and the write rolls back.
function collectionLinks(userId: string, collectionIds: string[]) {
  return collectionIds.map((id) => ({
    collection: { connect: { id, userId } },
  }));
}

// The type is looked up by name among the system types. Only the fields its
// type has are stored, so a stray language on a note, or a file on a snippet,
// never lands in the row.
//
// An upload that is confirmed but not saved (a failure below, or a dialog
// closed after the upload) stays in R2 until the account is purged: deleting
// it here would break the retry, since the form still holds its key.
export async function createUserItem(
  userId: string,
  input: CreateItemInput,
): Promise<CreateItemResult> {
  const { typeName, title, description, content, language, url, tags } = input;
  const { collectionIds } = input;

  const type = await getItemTypeByName(typeName);
  if (!type) return { success: false, error: INVALID_ITEM_TYPE, data: null };

  const fields = editableFields(typeName);
  let fileColumns = {};
  if (fields.file) {
    const file = await confirmFileColumns(userId, fields.file, input.file);
    if ("error" in file)
      return { success: false, error: file.error, data: null };
    fileColumns = file.columns;
  }

  try {
    const item = await prisma.item.create({
      data: {
        userId,
        typeId: type.id,
        contentType: contentTypeFor(typeName),
        title,
        description,
        ...(fields.content && { content }),
        ...(fields.language && { language }),
        ...(fields.url && { url }),
        ...fileColumns,
        tags: { create: tagLinks(userId, tags) },
        collections: { create: collectionLinks(userId, collectionIds) },
      },
      select: { id: true },
    });
    return { success: true, error: null, data: item };
  } catch (error) {
    if (isRecordNotFound(error)) {
      return { success: false, error: COLLECTION_NOT_FOUND, data: null };
    }
    // fileKey is the only unique column a file item can collide on: the same
    // upload sent twice, after a lost response.
    if (fields.file && hasPrismaCode(error, UNIQUE_VIOLATION_CODE)) {
      return { success: false, error: FILE_ALREADY_SAVED, data: null };
    }
    throw error;
  }
}

// Removes the caller's tags no item uses any more, after an update or delete
// unlinked them. Best effort: the item is already saved, so a failure is only
// logged. A create in another tab that links one of these tags at the same
// moment can lose that link (accepted, see "Known risks" in architecture.md).
async function deleteOrphanTags(userId: string): Promise<void> {
  try {
    await prisma.tag.deleteMany({ where: { userId, items: { none: {} } } });
  } catch (error) {
    console.error(`Deleting the unused tags of user ${userId} failed:`, error);
  }
}

// The owner is part of the where, so an id of someone else's item fails the
// same way as a missing one. Only the fields of the item's type are written;
// fields left out of the input stay as they are; the tags and collections are
// replaced as a whole. Links that stay are not rewritten, so they keep their
// addedAt, and an existing link was checked when it was made.
export async function updateUserItem(
  userId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<UpdateItemResult> {
  const current = await getItemEditState(userId, itemId);
  if (!current) return { success: false, error: ITEM_NOT_FOUND, data: null };

  const update = editableUpdate(current.typeName, input);
  if ("error" in update) {
    return { success: false, error: update.error, data: null };
  }
  const { tags, collectionIds, ...fields } = update.data;
  const linked = new Set(current.collectionIds);
  const added = collectionIds.filter((id) => !linked.has(id));

  // A delete of the item or a collection can win between the read and here:
  // P2025 below.
  try {
    await prisma.item.update({
      where: { id: itemId, userId },
      data: {
        ...fields,
        tags: { deleteMany: {}, create: tagLinks(userId, tags) },
        collections: {
          deleteMany: { collectionId: { notIn: collectionIds } },
          create: collectionLinks(userId, added),
        },
      },
      select: { id: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return {
        success: false,
        error: ITEM_OR_COLLECTION_NOT_FOUND,
        data: null,
      };
    }
    throw error;
  }
  await deleteOrphanTags(userId);

  const item = await getUserItemDetail(userId, itemId);
  if (!item) return { success: false, error: ITEM_NOT_FOUND, data: null };
  return { success: true, error: null, data: item };
}

// Raw SQL on purpose: Prisma stamps `updatedAt` on every update, and favoriting
// is not an edit. It is the one way to leave that column alone without reading
// it first; the price is that a renamed column fails only at runtime. The owner
// in the where makes someone else's item look missing.
export async function setUserItemFavorite(
  userId: string,
  itemId: string,
  isFavorite: boolean,
): Promise<OperationResult> {
  const favoritedAt = isFavorite ? new Date() : null;
  const count = await prisma.$executeRaw`
    UPDATE "Item"
    SET "isFavorite" = ${isFavorite}, "favoritedAt" = ${favoritedAt}
    WHERE "id" = ${itemId} AND "userId" = ${userId}
  `;

  if (count === 0) return { success: false, error: ITEM_NOT_FOUND };
  return { success: true, error: null };
}

// Removes the item's object from R2 before the row, so a failure leaves the
// row and the delete can be retried; a missing object counts as deleted.
async function deleteItemFile(
  userId: string,
  itemId: string,
  fileKey: string,
): Promise<OperationResult> {
  try {
    const result = await deleteUserObject(userId, fileKey);
    if (!result.success) {
      // A key outside the owner's prefix was never written by this app.
      console.error(`Item ${itemId} has a file key outside its owner's prefix`);
      return { success: false, error: FILE_DELETE_FAILED };
    }
    return result;
  } catch (error) {
    console.error(`Deleting the file of item ${itemId} failed:`, error);
    return { success: false, error: FILE_DELETE_FAILED };
  }
}

// As in the update, the owner in the where makes someone else's item look
// missing. Its tag and collection links go with it (onDelete: Cascade).
export async function deleteUserItem(
  userId: string,
  itemId: string,
): Promise<OperationResult> {
  const item = await getItemFileKey(userId, itemId);
  if (!item) return { success: false, error: ITEM_NOT_FOUND };

  if (item.fileKey) {
    const file = await deleteItemFile(userId, itemId, item.fileKey);
    if (!file.success) return file;
  }

  // A second delete can win between the read and here: P2025 below.
  try {
    await prisma.item.delete({
      where: { id: itemId, userId },
      select: { id: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    throw error;
  }
  await deleteOrphanTags(userId);

  return { success: true, error: null };
}
