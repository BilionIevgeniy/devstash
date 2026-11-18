import "server-only";

import { Prisma } from "@/generated/prisma/client";

const RECORD_NOT_FOUND_CODE = "P2025";
export const UNIQUE_VIOLATION_CODE = "P2002";
// A row that a foreign key with NoAction still points to (Item.typeId).
export const FOREIGN_KEY_VIOLATION_CODE = "P2003";

export function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export function isRecordNotFound(error: unknown): boolean {
  return hasPrismaCode(error, RECORD_NOT_FOUND_CODE);
}
