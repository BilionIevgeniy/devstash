import "server-only";

import { Prisma } from "@/generated/prisma/client";

const RECORD_NOT_FOUND_CODE = "P2025";
export const UNIQUE_VIOLATION_CODE = "P2002";

export function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export function isRecordNotFound(error: unknown): boolean {
  return hasPrismaCode(error, RECORD_NOT_FOUND_CODE);
}

// Links to the caller's tags, creating the ones the caller does not have yet.
export function tagLinks(userId: string, tags: string[]) {
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
export function collectionLinks(userId: string, collectionIds: string[]) {
  return collectionIds.map((id) => ({
    collection: { connect: { id, userId } },
  }));
}
