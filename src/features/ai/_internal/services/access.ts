import "server-only";

import {
  AI_APP_LIMIT_KEY,
  AI_BY_APP_DAY,
  AI_BY_USER_DAY,
  AI_BY_USER_HOUR,
} from "@/features/ai/domain/rate-limits";
import { tooManyAttemptsParams } from "@/features/auth/domain/rate-limits";
import { getEntitlements } from "@/features/billing/queries";
import { fail, type Failure } from "@/lib/action-result";
import { consumeRateLimit } from "@/lib/rate-limit";

export type AiRefusalReason = "not-pro" | "limited";

export type AiAccess =
  { success: true; error: null } | (Failure & { reason: AiRefusalReason });

function refused(failure: Failure, reason: AiRefusalReason): AiAccess {
  return { ...failure, reason };
}

// The check every AI operation starts with, in the order of presignUpload:
// the plan, the user's hourly and daily limits, then the app's daily limit,
// which caps the bill whoever reaches Pro. It is the enforcement; the
// UI only follows it. An Upstash outage throws, so nothing reaches OpenAI
// unchecked. A past_due subscription passes: PRO_STATUSES grants Pro there.
export async function checkAiAccess(userId: string): Promise<AiAccess> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return refused(fail("aiProOnly"), "not-pro");

  const hour = await consumeRateLimit(AI_BY_USER_HOUR, userId);
  if (!hour.success) {
    return refused(
      fail("tooManyAttempts", tooManyAttemptsParams(hour.reset, Date.now())),
      "limited",
    );
  }

  // Worded apart: the shared message counts in minutes, which reads badly
  // for a window of a day.
  const day = await consumeRateLimit(AI_BY_USER_DAY, userId);
  if (!day.success) return refused(fail("aiDailyLimit"), "limited");

  const app = await consumeRateLimit(AI_BY_APP_DAY, AI_APP_LIMIT_KEY);
  if (!app.success) return refused(fail("aiAppLimit"), "limited");

  return { success: true, error: null };
}
