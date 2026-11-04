import "server-only";

import type { CreateCollectionInput } from "@/features/collections/schemas";
import type { OperationResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";

export async function createUserCollection(
  userId: string,
  { name, description }: CreateCollectionInput,
): Promise<OperationResult> {
  await prisma.collection.create({
    data: { userId, name, description },
    select: { id: true },
  });

  return { success: true, error: null };
}
