"use server";

import { refresh } from "next/cache";

import { getSessionUser } from "@/features/auth/nextauth/session";
import {
  customTypeIdSchema,
  customTypeInputSchema,
} from "@/features/item-types/schemas";
import {
  createCustomType as createUserCustomType,
  deleteCustomType as deleteUserCustomType,
  updateCustomType as updateUserCustomType,
} from "@/features/item-types/services/custom-types";
import { fail, ok, type ActionResult } from "@/lib/errors/action-result";
import { firstIssue } from "@/lib/errors/validation";
import { logger } from "@/lib/observability/logger";

// The sidebar and every page show the type names, so each success refreshes
// the page with its layout (docs/architecture.md, "Revalidation").

export async function createCustomType(data: unknown): Promise<ActionResult> {
  const parsed = customTypeInputSchema.safeParse(data);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await createUserCustomType(userId, parsed.data);
    if (!result.success) return result;
    refresh();
    return ok();
  } catch (error) {
    await logger.error("Creating the custom type failed", { error, userId });
    return fail("generic");
  }
}

export async function updateCustomType(
  typeId: string,
  data: unknown,
): Promise<ActionResult> {
  const parsedId = customTypeIdSchema.safeParse(typeId);
  if (!parsedId.success) return firstIssue(parsedId.error);

  const parsed = customTypeInputSchema.safeParse(data);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await updateUserCustomType(
      userId,
      parsedId.data,
      parsed.data,
    );
    if (!result.success) return result;
    refresh();
    return ok();
  } catch (error) {
    await logger.error("Updating the custom type failed", {
      error,
      userId,
      typeId: parsedId.data,
    });
    return fail("generic");
  }
}

export async function deleteCustomType(typeId: string): Promise<ActionResult> {
  const parsedId = customTypeIdSchema.safeParse(typeId);
  if (!parsedId.success) return firstIssue(parsedId.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await deleteUserCustomType(userId, parsedId.data);
    if (!result.success) return result;
    refresh();
    return ok();
  } catch (error) {
    await logger.error("Deleting the custom type failed", {
      error,
      userId,
      typeId: parsedId.data,
    });
    return fail("generic");
  }
}
