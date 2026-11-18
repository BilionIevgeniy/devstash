import "server-only";

import { tooManyAttemptsParams } from "@/features/auth/domain/rate-limits";
import { getUserIdByEmail, getUserProfile } from "@/features/auth/queries";
import {
  buildCancellationEmail,
  buildOperatorNotice,
  type CancellationRecord,
} from "@/features/billing/_internal/emails/cancellation-email";
import { getLiveSubscriptionRef } from "@/features/billing/_internal/queries";
import { syncSubscription } from "@/features/billing/_internal/services/subscription-sync";
import {
  CANCEL_BY_EMAIL,
  CANCEL_BY_IP,
} from "@/features/billing/domain/cancellation";
import { getContractState } from "@/features/billing/queries";
import type {
  CancellationDeclarationInput,
  OwnCancellationInput,
} from "@/features/billing/schemas";
import type { Locale } from "@/i18n/config";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import { OPERATOR } from "@/lib/legal/operator";
import { logger } from "@/lib/observability/logger";
import {
  consumeIpRateLimit,
  consumeRateLimit,
  isRateLimitConfigured,
  RateLimitUnavailableError,
} from "@/lib/vendors/rate-limit";
import { consumeLocalRateLimit } from "@/lib/vendors/local-rate-limit";
import { getStripe } from "@/lib/vendors/stripe";
import { sendEmail } from "@/lib/vendors/email";

/** What a declaration did: only "cancelled" changed anything. */
type Effect =
  | { status: "none" }
  | { status: "already"; periodEnd: Date | null }
  | { status: "cancelled"; periodEnd: Date | null };

function periodEndOf(iso: string | null): Date | null {
  return iso ? new Date(iso) : null;
}

// Sets the live subscription to end with its term and lets the sync write it.
// Ending at the term, not at once, is what an ordinary cancellation means and
// what a wrongly filed one can still undo in the portal (ADR 0032). A contract
// that does not run, or already ends, is left alone: no Stripe call, and the
// caller sends no second email.
async function cancelAtPeriodEnd(userId: string): Promise<Effect> {
  const before = await getContractState(userId);
  if (before.status === "none") return { status: "none" };
  if (before.status === "cancelling") {
    return { status: "already", periodEnd: periodEndOf(before.periodEnd) };
  }
  const ref = await getLiveSubscriptionRef(userId);
  if (!ref) return { status: "none" };

  await getStripe().subscriptions.update(ref.subscriptionId, {
    cancel_at_period_end: true,
  });
  await syncSubscription(ref.customerId, ref.subscriptionId);
  const after = await getContractState(userId);
  return { status: "cancelled", periodEnd: periodEndOf(after.periodEnd) };
}

// Sent only when a running contract was ended (cancelAtPeriodEnd), which is
// what keeps the holder from being flooded through the form.
async function confirmToHolder(
  userId: string,
  record: CancellationRecord,
): Promise<void> {
  const profile = await getUserProfile(userId);
  if (!profile) return;
  const result = await sendEmail({
    to: profile.email,
    ...buildCancellationEmail(record),
  });
  if (!result.success) {
    await logger.error("The cancellation confirmation was not sent", {
      userId,
    });
  }
}

// The operator's inbox is where a declaration is finished by hand, so a notice
// that does not go out is an error: Sentry gets the ids, and the caller of the
// deferred work rethrows, so the platform records the failed task too.
async function notifyOperator(
  subject: string,
  facts: Record<string, string>,
  userId?: string,
): Promise<boolean> {
  const result = await sendEmail({
    to: OPERATOR.email,
    ...buildOperatorNotice({ subject, facts }),
  });
  if (!result.success) {
    await logger.error("Notifying the operator failed", { userId });
  }
  return result.success;
}

function extraordinaryFacts(
  record: CancellationRecord,
  contact: { userId: string; email?: string },
): Record<string, string> {
  return {
    declaredAt: record.declaredAt.toISOString(),
    userId: contact.userId,
    ...(contact.email ? { email: contact.email } : {}),
    ...(record.name ? { name: record.name } : {}),
    reason: record.reason ?? "",
  };
}

// The signed-in cancellation (§ 312k BGB): it takes effect at once, and the
// confirmation goes to the account's address.
export async function cancelOwnSubscription(
  userId: string,
  input: OwnCancellationInput,
  locale: Locale,
  now: Date,
): Promise<OperationResult<{ declaredAt: string }>> {
  const effect = await cancelAtPeriodEnd(userId);
  if (effect.status === "none") return fail("noLiveContract");
  // Already ending: the first declaration was confirmed. One for good cause
  // asks for an earlier end, which the operator decides by hand.
  if (effect.status === "already") {
    if (input.kind === "extraordinary") {
      await notifyOperator(
        "Extraordinary cancellation of a contract already ending",
        extraordinaryFacts(
          { locale, ...input, declaredAt: now, periodEnd: effect.periodEnd },
          { userId },
        ),
        userId,
      );
    }
    return ok({ declaredAt: now.toISOString() });
  }

  const record: CancellationRecord = {
    locale,
    ...input,
    declaredAt: now,
    periodEnd: effect.periodEnd,
  };
  await confirmToHolder(userId, record);
  if (input.kind === "extraordinary") {
    await notifyOperator(
      "Extraordinary cancellation",
      extraordinaryFacts(record, { userId }),
      userId,
    );
  }
  return ok({ declaredAt: now.toISOString() });
}

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

// Only a declaration that ended a running contract is confirmed, and the
// email repeats none of the visitor's free text (name, reason): the form is
// open to anyone, and DevStash must not carry a stranger's words to the
// holder. The operator gets them for a cancellation for good cause.
async function processDeclaration(
  input: CancellationDeclarationInput,
  locale: Locale,
  declaredAt: Date,
): Promise<void> {
  const userId = await getUserIdByEmail(input.email);
  if (!userId) return; // Nobody to confirm to; the screen holds the record.

  const effect = await cancelAtPeriodEnd(userId);
  if (effect.status === "none") return;
  const record: CancellationRecord = {
    locale,
    kind: input.kind,
    declaredAt,
    periodEnd: effect.periodEnd,
  };
  if (effect.status === "cancelled") await confirmToHolder(userId, record);
  // For good cause the operator decides, also on a contract already ending.
  if (input.kind === "extraordinary") {
    await notifyOperator(
      effect.status === "cancelled"
        ? "Extraordinary cancellation"
        : "Extraordinary cancellation of a contract already ending",
      {
        ...extraordinaryFacts(record, { userId, email: input.email }),
        name: input.name,
        reason: input.reason ?? "",
      },
      userId,
    );
  }
}

// The signed-out declaration, run after the answer (the action's after()),
// so its timing reveals nothing about the address. A failure is never lost in
// silence: Sentry gets the ids, and the operator gets the declaration to
// finish by hand.
export async function processCancellationDeclaration(
  input: CancellationDeclarationInput,
  locale: Locale,
  declaredAt: Date,
): Promise<void> {
  try {
    await processDeclaration(input, locale, declaredAt);
  } catch (error) {
    await logger.error("Processing a cancellation declaration failed", {
      error,
    });
    await notifyOperator("A cancellation needs to be finished by hand", {
      declaredAt: declaredAt.toISOString(),
      kind: input.kind,
      name: input.name,
      email: input.email,
      reason: input.reason ?? "",
    });
    // after() reports the failed task as well.
    throw error;
  }
}
