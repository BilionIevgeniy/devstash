import { handleStripeEvent } from "@/features/billing/services/webhook";
import { fail } from "@/lib/errors/action-result";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { logger } from "@/lib/observability/logger";
import {
  constructStripeEvent,
  isStripeSignatureError,
  type StripeEvent,
} from "@/lib/vendors/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError(fail("invalidSignature"), 400);

  let event: StripeEvent;
  try {
    event = constructStripeEvent(await request.text(), signature);
  } catch (error) {
    if (isStripeSignatureError(error))
      return jsonError(fail("invalidSignature"), 400);
    // 500 so Stripe retries: a missing secret is ours to fix.
    await logger.error("Verifying a Stripe event failed", { error });
    return jsonError(fail("serverError"), 500);
  }

  try {
    await handleStripeEvent(event);
    return jsonOk({ received: true });
  } catch (error) {
    // The log and Sentry are the only record of an event: there is no event table.
    await logger.error(`Stripe event of type ${event.type} failed`, {
      error,
      stripeEventId: event.id,
    });
    return jsonError(fail("serverError"), 500);
  }
}
