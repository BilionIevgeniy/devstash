"use server";

import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";
import { aiItemInputSchema } from "@/features/ai/schemas";
import { suggestTags } from "@/features/ai/services/auto-tags";
import { getSessionUser } from "@/features/auth/nextauth/session";
import type { ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";

function failure(error: string): ActionResult<null> {
  return { success: false, data: null, error };
}

// Nothing is written, so there is no refresh: the tags only change the form.
export async function generateAutoTags(
  data: unknown,
): Promise<ActionResult<string[] | null>> {
  const parsed = aiItemInputSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await suggestTags(userId, parsed.data);
    if (!result.success) return failure(result.error ?? AI_UNAVAILABLE_MESSAGE);
    return { success: true, error: null, data: result.data };
  } catch (error) {
    await logger.error("Suggesting tags failed", { error, userId });
    return failure(AI_UNAVAILABLE_MESSAGE);
  }
}
