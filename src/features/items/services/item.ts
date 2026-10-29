import "server-only";

import { getItemTypeByName } from "@/features/item-types/queries";
import {
  contentTypeFor,
  editableFields,
} from "@/features/items/domain/item-fields";
import { getItemDetail } from "@/features/items/queries";
import type {
  CreateItemInput,
  UpdateItemInput,
} from "@/features/items/schemas";
import type { ItemDetail } from "@/features/items/types";
import { Prisma } from "@/generated/prisma/client";
import type { OperationResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

const ITEM_NOT_FOUND = "Item not found";
const INVALID_ITEM_TYPE = "Invalid item type";
const RECORD_NOT_FOUND_CODE = "P2025";

export interface UpdateItemResult extends OperationResult {
  data: ItemDetail | null;
}

export interface CreateItemResult extends OperationResult {
  data: { id: string } | null;
}

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === RECORD_NOT_FOUND_CODE
  );
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

// The type is looked up by name among the system types. Only the fields its
// type has are stored, so a stray language on a note never lands in the row.
export async function createUserItem(
  userId: string,
  input: CreateItemInput,
): Promise<CreateItemResult> {
  const { typeName, title, description, content, language, url, tags } = input;

  const type = await getItemTypeByName(typeName);
  if (!type) return { success: false, error: INVALID_ITEM_TYPE, data: null };

  const fields = editableFields(typeName);
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
      tags: { create: tagLinks(userId, tags) },
    },
    select: { id: true },
  });

  return { success: true, error: null, data: item };
}

// The owner is part of the where, so an id of someone else's item fails the
// same way as a missing one. Fields left out of the input stay as they are;
// the tags are replaced as a whole.
export async function updateUserItem(
  userId: string,
  itemId: string,
  input: UpdateItemInput,
): Promise<UpdateItemResult> {
  const { tags, ...fields } = input;

  try {
    await prisma.item.update({
      where: { id: itemId, userId },
      data: {
        ...fields,
        tags: { deleteMany: {}, create: tagLinks(userId, tags) },
      },
      select: { id: true },
    });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return { success: false, error: ITEM_NOT_FOUND, data: null };
    }
    throw error;
  }

  const item = await getItemDetail(userId, itemId);
  if (!item) return { success: false, error: ITEM_NOT_FOUND, data: null };
  return { success: true, error: null, data: item };
}

// As in the update, the owner in the where makes someone else's item look
// missing. Its tag and collection links go with it (onDelete: Cascade).
export async function deleteUserItem(
  userId: string,
  itemId: string,
): Promise<OperationResult> {
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

  return { success: true, error: null };
}
