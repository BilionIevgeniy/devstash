"use server";

import { refresh } from "next/cache";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { createCollectionSchema } from "@/features/collections/schemas";
import { createUserCollection } from "@/features/collections/services/collection";
import type { ActionResult } from "@/lib/action-result";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function failure(error: string): ActionResult<null> {
  return { success: false, data: null, error };
}

export async function createCollection(data: unknown): Promise<ActionResult> {
  const parsed = createCollectionSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await createUserCollection(userId, parsed.data);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    // The new collection comes back with this response's fresh page.
    refresh();
    return { success: true, error: null, data: null };
  } catch (error) {
    console.error("Creating the collection failed:", error);
    return failure(GENERIC_ERROR);
  }
}
