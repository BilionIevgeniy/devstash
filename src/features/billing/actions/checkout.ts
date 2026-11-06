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
import type { ActionResult } from "@/lib/action-result";
import { getAppOrigin } from "@/lib/app-url";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function failure(error: string): ActionResult {
  return { success: false, data: null, error };
}

export async function startCheckout(plan: unknown): Promise<ActionResult> {
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const user = await getSessionUser();

  let url: string;
  try {
    const result = await createCheckoutSession(
      user,
      parsed.data,
      getAppOrigin(),
    );
    if (!result.success || !result.data) {
      return failure(result.error ?? GENERIC_ERROR);
    }
    url = result.data.url;
  } catch (error) {
    console.error("Starting the checkout failed:", error);
    return failure(GENERIC_ERROR);
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
    if (!result.success || !result.data) {
      return failure(result.error ?? GENERIC_ERROR);
    }
    url = result.data.url;
  } catch (error) {
    console.error("Opening the billing portal failed:", error);
    return failure(GENERIC_ERROR);
  }

  // Outside the try: redirect() throws.
  redirect(url);
}

export async function confirmCheckout(
  sessionId: unknown,
): Promise<ActionResult<{ isPro: boolean } | null>> {
  const parsed = checkoutSessionIdSchema.safeParse(sessionId);
  if (!parsed.success) return failure(parsed.error.issues[0].message);

  // Outside the try: a signed-out caller is redirected by a thrown error.
  const { id: userId } = await getSessionUser();

  try {
    const result = await confirmCheckoutSession(userId, parsed.data);
    if (!result.success) return failure(result.error ?? GENERIC_ERROR);
    // After the sync: this read is cached for the request.
    const { isPro } = await getBillingOverview(userId);
    refresh();
    return { success: true, error: null, data: { isPro } };
  } catch (error) {
    console.error("Confirming the checkout failed:", error);
    return failure(GENERIC_ERROR);
  }
}
