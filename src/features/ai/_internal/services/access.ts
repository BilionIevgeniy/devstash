import "server-only";

import {
  AI_APP_LIMIT_KEY,
  AI_BY_APP_DAY,
  AI_BY_USER_DAY,
  AI_BY_USER_HOUR,
} from "@/features/ai/domain/rate-limits";
import {
  AI_APP_LIMIT_MESSAGE,
  AI_DAILY_LIMIT_MESSAGE,
  AI_PRO_ONLY_MESSAGE,
} from "@/features/ai/domain/messages";
import { getTooManyAttemptsMessage } from "@/features/auth/domain/rate-limits";
import { getEntitlements } from "@/features/billing/queries";
import type { OperationResult } from "@/lib/action-result";
import { consumeRateLimit } from "@/lib/rate-limit";

function refused(error: string): OperationResult {
  return { success: false, error };
}

// The check every AI operation starts with, in the order of presignUpload:
// the plan, the user's hourly and daily limits, then the app's daily limit,
// which caps the bill whoever reaches Pro. It is the enforcement; the
// UI only follows it. An Upstash outage throws, so nothing reaches OpenAI
// unchecked. A past_due subscription passes: PRO_STATUSES grants Pro there.
export async function checkAiAccess(userId: string): Promise<OperationResult> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) return refused(AI_PRO_ONLY_MESSAGE);

  const hour = await consumeRateLimit(AI_BY_USER_HOUR, userId);
  if (!hour.success) {
    return refused(getTooManyAttemptsMessage(hour.reset, Date.now()));
  }

  // Worded apart: the shared message counts in minutes, which reads badly
  // for a window of a day.
  const day = await consumeRateLimit(AI_BY_USER_DAY, userId);
  if (!day.success) return refused(AI_DAILY_LIMIT_MESSAGE);

  const app = await consumeRateLimit(AI_BY_APP_DAY, AI_APP_LIMIT_KEY);
  if (!app.success) return refused(AI_APP_LIMIT_MESSAGE);

  return { success: true, error: null };
}
