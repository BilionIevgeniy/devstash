import "server-only";

import {
  CANCEL_BY_EMAIL,
  CANCEL_BY_IP,
  CANCEL_BY_USER,
} from "@/features/billing/domain/cancellation";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import { tooManyAttemptsParams } from "@/lib/http/retry-after";
import { consumeLocalRateLimit } from "@/lib/vendors/local-rate-limit";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  isRateLimitConfigured,
  RateLimitUnavailableError,
} from "@/lib/vendors/rate-limit";

const OUTAGE_LIMIT_FAILED = fail("tooManyAttemptsNoTime");

// While Upstash is down the declaration is taken anyway, counted only in the
// memory of this instance.
function checkLocally(email: string, ip: string | null, now: Date) {
  const time = now.getTime();
  const allowed =
    (!ip || consumeLocalRateLimit(CANCEL_BY_IP, ip, time)) &&
    consumeLocalRateLimit(CANCEL_BY_EMAIL, email, time);
  return allowed ? ok() : OUTAGE_LIMIT_FAILED;
}

// The limits of the signed-out form. A refusal depends only on how often a
// request comes, so it may say so. When Upstash is down the declaration is
// taken anyway, bounded per instance: a consumer's cancellation must never be
// lost to an outage of ours (ADR 0032); consumeRateLimit has logged it. A
// missing setting is not an outage: it throws, so the form fails loudly.
export async function checkCancellationLimit(
  email: string,
  ip: string | null,
  now: Date,
): Promise<OperationResult> {
  if (!isRateLimitConfigured()) {
    throw new Error("Rate limiting is not configured");
  }
  try {
    for (const check of [
      () => consumeIpRateLimit(CANCEL_BY_IP, ip),
      () => consumeRateLimit(CANCEL_BY_EMAIL, email),
    ]) {
      const result = await check();
      if (!result.success) {
        return fail(
          "tooManyAttempts",
          tooManyAttemptsParams(result.reset, now.getTime()),
        );
      }
    }
    return ok();
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return checkLocally(email, ip, now);
    }
    throw error;
  }
}

// While Upstash is down the declaration is taken anyway, as the signed-out one.
export async function checkOwnDeclarationLimit(
  userId: string,
  now: Date,
): Promise<OperationResult> {
  try {
    const { success, reset } = await consumeRateLimit(CANCEL_BY_USER, userId);
    return success
      ? ok()
      : fail("tooManyAttempts", tooManyAttemptsParams(reset, now.getTime()));
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) throw error;
    return consumeLocalRateLimit(CANCEL_BY_USER, userId, now.getTime())
      ? ok()
      : OUTAGE_LIMIT_FAILED;
  }
}
