"use server";

import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";
import { aiItemInputSchema } from "@/features/ai/schemas";
import { suggestTags } from "@/features/ai/services/auto-tags";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { firstIssueMessage } from "@/lib/validation";

// Nothing is written, so there is no refresh: the tags only change the form.
export async function generateAutoTags(
  data: unknown,
): Promise<ActionResult<string[] | null>> {
  const parsed = aiItemInputSchema.safeParse(data);
  if (!parsed.success) return fail(firstIssueMessage(parsed.error));

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await suggestTags(userId, parsed.data);
    if (!result.success) return fail(result.error);
    return ok(result.data);
  } catch (error) {
    await logger.error("Suggesting tags failed", { error, userId });
    return fail(AI_UNAVAILABLE_MESSAGE);
  }
}
