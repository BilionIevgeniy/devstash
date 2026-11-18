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
  RateLimitUnavailableError,
} from "@/lib/vendors/rate-limit";
import { getStripe } from "@/lib/vendors/stripe";
import { sendEmail } from "@/lib/vendors/email";

type Outcome = CancellationRecord["outcome"];

// Sets the live subscription to end with its term and lets the sync write it.
// Ending at the term, not at once, is what an ordinary cancellation means and
// what a wrongly filed one can still undo in the portal (ADR 0032).
async function cancelAtPeriodEnd(userId: string): Promise<Outcome> {
  const ref = await getLiveSubscriptionRef(userId);
  if (!ref) return { status: "none" };

  await getStripe().subscriptions.update(ref.subscriptionId, {
    cancel_at_period_end: true,
  });
  await syncSubscription(ref.customerId, ref.subscriptionId);
  const { status, periodEnd } = await getContractState(userId);
  if (status === "none") return { status: "none" };
  return {
    status: "cancelled",
    periodEnd: periodEnd ? new Date(periodEnd) : null,
  };
}

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

async function notifyOperator(
  subject: string,
  facts: Record<string, string>,
): Promise<void> {
  await sendEmail({
    to: OPERATOR.email,
    ...buildOperatorNotice({ subject, facts }),
  });
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
  const outcome = await cancelAtPeriodEnd(userId);
  if (outcome.status === "none") return fail("noLiveContract");

  const record: CancellationRecord = {
    locale,
    ...input,
    declaredAt: now,
    outcome,
  };
  await confirmToHolder(userId, record);
  if (input.kind === "extraordinary") {
    await notifyOperator(
      "Extraordinary cancellation",
      extraordinaryFacts(record, { userId }),
    );
  }
  return ok({ declaredAt: now.toISOString() });
}

// The limits of the signed-out form. A refusal depends only on how often a
// request comes, so it may say so. When Upstash is down the declaration is
// taken anyway: a consumer's cancellation must never be lost to an outage of
// ours (ADR 0032); consumeRateLimit has logged the outage.
export async function checkCancellationLimit(
  email: string,
  ip: string | null,
  now: Date,
): Promise<OperationResult> {
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
    if (error instanceof RateLimitUnavailableError) return ok();
    throw error;
  }
}

async function processDeclaration(
  input: CancellationDeclarationInput,
  locale: Locale,
  declaredAt: Date,
): Promise<void> {
  const userId = await getUserIdByEmail(input.email);
  if (!userId) return; // Nobody to confirm to; the screen holds the record.

  const outcome = await cancelAtPeriodEnd(userId);
  const record: CancellationRecord = {
    locale,
    kind: input.kind,
    reason: input.reason,
    name: input.name,
    declaredAt,
    outcome,
  };
  await confirmToHolder(userId, record);
  if (input.kind === "extraordinary") {
    await notifyOperator(
      "Extraordinary cancellation",
      extraordinaryFacts(record, { userId, email: input.email }),
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
  }
}
