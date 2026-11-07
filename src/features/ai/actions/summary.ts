"use server";

import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";
import { aiItemInputSchema } from "@/features/ai/schemas";
import { summarizeItem } from "@/features/ai/services/summary";
import { getSessionUser } from "@/features/auth/nextauth/session";
import type { ActionResult } from "@/lib/action-result";
import { aiErrorSummary } from "@/lib/openai";

function failure(error: string): ActionResult<null> {
  return { success: false, data: null, error };
}

// Nothing is written, so there is no refresh: the summary only changes the form.
export async function generateSummary(
  data: unknown,
): Promise<ActionResult<string | null>> {
  const parsed = aiItemInputSchema.safeParse(data);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await summarizeItem(userId, parsed.data);
    if (!result.success) return failure(result.error ?? AI_UNAVAILABLE_MESSAGE);
    return { success: true, error: null, data: result.data };
  } catch (error) {
    console.error("Summarizing an item failed:", aiErrorSummary(error));
    return failure(AI_UNAVAILABLE_MESSAGE);
  }
}
