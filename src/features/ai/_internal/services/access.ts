import "server-only";

import {
  AI_APP_LIMIT_KEY,
  AI_BY_APP_DAY,
  AI_BY_USER_DAY,
  AI_BY_USER_HOUR,
} from "@/features/ai/domain/rate-limits";
import {
  getRetryAfterSeconds,
  tooManyAttemptsParams,
} from "@/lib/http/retry-after";
import { getEntitlements } from "@/features/billing/queries";
import { fail, type Failure } from "@/lib/errors/action-result";
import { consumeRateLimit } from "@/lib/vendors/rate-limit";

// The failure goes to the client as it is; the seconds are for the route's
// Retry-After header, never for the body.
export type AiRefusal =
  | { reason: "not-pro"; failure: Failure }
  | { reason: "limited"; failure: Failure; retryAfterSeconds: number };

export type AiAccess =
  { success: true } | { success: false; refusal: AiRefusal };

function limited(failure: Failure, reset: number, now: number): AiAccess {
  const retryAfterSeconds = getRetryAfterSeconds(reset, now);
  return {
    success: false,
    refusal: { reason: "limited", failure, retryAfterSeconds },
  };
}

// The check every AI operation starts with, in the order of presignUpload:
// the plan, the user's hourly and daily limits, then the app's daily limit,
// which caps the bill whoever reaches Pro. It is the enforcement; the
// UI only follows it. An Upstash outage throws, so nothing reaches OpenAI
// unchecked. A past_due subscription passes: PRO_STATUSES grants Pro there.
export async function checkAiAccess(userId: string): Promise<AiAccess> {
  const { isPro } = await getEntitlements(userId);
  if (!isPro) {
    return {
      success: false,
      refusal: { reason: "not-pro", failure: fail("aiProOnly") },
    };
  }

  const hour = await consumeRateLimit(AI_BY_USER_HOUR, userId);
  const now = Date.now();
  if (!hour.success) {
    const params = tooManyAttemptsParams(hour.reset, now);
    return limited(fail("tooManyAttempts", params), hour.reset, now);
  }

  // Worded apart: the shared message counts in minutes, which reads badly
  // for a window of a day.
  const day = await consumeRateLimit(AI_BY_USER_DAY, userId);
  if (!day.success) return limited(fail("aiDailyLimit"), day.reset, now);

  const app = await consumeRateLimit(AI_BY_APP_DAY, AI_APP_LIMIT_KEY);
  if (!app.success) return limited(fail("aiAppLimit"), app.reset, now);

  return { success: true };
}
