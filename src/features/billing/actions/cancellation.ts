"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { getLocale } from "next-intl/server";

import { getSessionUser } from "@/features/auth/nextauth/session";
import {
  cancellationDeclarationSchema,
  ownCancellationSchema,
} from "@/features/billing/schemas";
import {
  cancelOwnSubscription,
  processCancellationDeclaration,
} from "@/features/billing/services/cancellation";
import { checkCancellationLimit } from "@/features/billing/services/cancellation-limits";
import { isLocale, DEFAULT_LOCALE } from "@/i18n/config";
import { fail, ok, type ActionResult } from "@/lib/errors/action-result";
import { firstIssue } from "@/lib/errors/validation";
import { getClientIp } from "@/lib/http/client-ip";
import { logger } from "@/lib/observability/logger";

export type DeclarationResult = ActionResult<{ declaredAt: string }>;

async function requestLocale() {
  const locale = await getLocale();
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

// § 312k BGB, signed in: the contract is the session's, cancelled at once.
export async function cancelOwnContract(
  input: unknown,
): Promise<DeclarationResult> {
  const parsed = ownCancellationSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const user = await getSessionUser();

  try {
    const result = await cancelOwnSubscription(
      user.id,
      parsed.data,
      await requestLocale(),
      new Date(),
    );
    if (result.success) refresh();
    return result;
  } catch (error) {
    await logger.error("Cancelling a subscription failed", {
      error,
      userId: user.id,
    });
    return fail("generic");
  }
}

// § 312k BGB, signed out: the submission is the declaration. The answer is the
// same whether or not the address has an account; the work runs in after(),
// the one entry point with a second call (ADR 0032), so its timing says
// nothing either.
export async function declareCancellation(
  input: unknown,
): Promise<DeclarationResult> {
  const parsed = cancellationDeclarationSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  const declaredAt = new Date();
  try {
    const limit = await checkCancellationLimit(
      parsed.data.email,
      getClientIp(await headers()),
      declaredAt,
    );
    if (!limit.success) return limit;
  } catch (error) {
    await logger.error("Checking a cancellation's limits failed", { error });
    return fail("generic");
  }

  const locale = await requestLocale();
  after(() => processCancellationDeclaration(parsed.data, locale, declaredAt));
  return ok({ declaredAt: declaredAt.toISOString() });
}
