"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth/nextauth/session";
import { getBillingOverview } from "@/features/billing/queries";
import {
  checkoutSessionIdSchema,
  planSchema,
} from "@/features/billing/schemas";
import {
  confirmCheckoutSession,
  createCheckoutSession,
  createPortalSession,
} from "@/features/billing/services/checkout";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { getAppOrigin } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";

export async function startCheckout(plan: unknown): Promise<ActionResult> {
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const user = await getSessionUser();

  let url: string;
  try {
    const result = await createCheckoutSession(
      user,
      parsed.data,
      getAppOrigin(),
    );
    if (!result.success) return result;
    url = result.data.url;
  } catch (error) {
    await logger.error("Starting the checkout failed", {
      error,
      userId: user.id,
    });
    return fail("generic");
  }

  // Outside the try: redirect() throws.
  redirect(url);
}

export async function openBillingPortal(): Promise<ActionResult> {
  // Outside the try: a signed-out caller is redirected by a thrown error.
  const user = await getSessionUser();

  let url: string;
  try {
    const result = await createPortalSession(user.id, getAppOrigin());
    if (!result.success) return result;
    url = result.data.url;
  } catch (error) {
    await logger.error("Opening the billing portal failed", {
      error,
      userId: user.id,
    });
    return fail("generic");
  }

  // Outside the try: redirect() throws.
  redirect(url);
}

export async function confirmCheckout(
  sessionId: unknown,
): Promise<ActionResult<{ isPro: boolean }>> {
  const parsed = checkoutSessionIdSchema.safeParse(sessionId);
  if (!parsed.success) return firstIssue(parsed.error);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await confirmCheckoutSession(userId, parsed.data);
    if (!result.success) return result;
    // After the sync: this read is cached for the request.
    const { isPro } = await getBillingOverview(userId);
    refresh();
    return ok({ isPro });
  } catch (error) {
    await logger.error("Confirming the checkout failed", { error, userId });
    return fail("generic");
  }
}
