"use server";

import { aiItemInputSchema } from "@/features/ai/schemas";
import { summarizeItem } from "@/features/ai/services/summary";
import { getSessionUser } from "@/features/auth/nextauth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

// Nothing is written, so there is no refresh: the summary only changes the form.
export async function generateSummary(
  data: unknown,
): Promise<ActionResult<string>> {
  const parsed = aiItemInputSchema.safeParse(data);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await summarizeItem(userId, parsed.data);
    if (!result.success) return result;
    return ok(result.data);
  } catch (error) {
    await logger.error("Summarizing an item failed", { error, userId });
    return fail("aiUnavailable");
  }
}
