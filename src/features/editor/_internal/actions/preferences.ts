"use server";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { SAVE_FAILED_MESSAGE } from "@/features/editor/_internal/domain/preferences";
import { saveEditorPreferences } from "@/features/editor/_internal/services/preferences";
import { editorPreferencesSchema } from "@/features/editor/schemas";
import type { ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";

function failure(error: string): ActionResult {
  return { success: false, data: null, error };
}

export async function updateEditorPreferences(
  data: unknown,
): Promise<ActionResult> {
  const parsed = editorPreferencesSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await saveEditorPreferences(userId, parsed.data);
    if (!result.success) return failure(result.error ?? SAVE_FAILED_MESSAGE);
    return { success: true, error: null, data: null };
  } catch (error) {
    await logger.error("Saving the editor preferences failed", {
      error,
      userId,
    });
    return failure(SAVE_FAILED_MESSAGE);
  }
}
