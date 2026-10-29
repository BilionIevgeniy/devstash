import "server-only";

import { getItemDetail } from "@/features/items/queries";
import type { UpdateItemInput } from "@/features/items/schemas";
import type { ItemDetail } from "@/features/items/types";
import { Prisma } from "@/generated/prisma/client";
import type { OperationResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

const ITEM_NOT_FOUND = "Item not found";
const RECORD_NOT_FOUND_CODE = "P2025";

export interface UpdateItemResult extends OperationResult {
  data: ItemDetail | null;
}

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === RECORD_NOT_FOUND_CODE
  );
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
        tags: {
          deleteMany: {},
          create: tags.map((name) => ({
            tag: {
              connectOrCreate: {
                where: { userId_name: { userId, name } },
                create: { userId, name },
              },
            },
          })),
        },
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
