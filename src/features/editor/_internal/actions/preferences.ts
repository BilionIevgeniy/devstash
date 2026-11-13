"use server";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { saveEditorPreferences } from "@/features/editor/_internal/services/preferences";
import { editorPreferencesSchema } from "@/features/editor/schemas";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

export async function updateEditorPreferences(
  data: unknown,
): Promise<ActionResult> {
  const parsed = editorPreferencesSchema.safeParse(data);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await saveEditorPreferences(userId, parsed.data);
    if (!result.success) return result;
    return ok();
  } catch (error) {
    await logger.error("Saving the editor preferences failed", {
      error,
      userId,
    });
    return fail("preferencesSaveFailed");
  }
}
