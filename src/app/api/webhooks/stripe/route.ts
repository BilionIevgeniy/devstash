import { handleStripeEvent } from "@/features/billing/services/webhook";
import {
  constructStripeEvent,
  isStripeSignatureError,
  type StripeEvent,
} from "@/lib/stripe";

const INVALID_SIGNATURE = "Invalid signature";
const SERVER_ERROR = "Something went wrong";

function failure(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return failure(INVALID_SIGNATURE, 400);

  let event: StripeEvent;
  try {
    event = constructStripeEvent(await request.text(), signature);
  } catch (error) {
    if (isStripeSignatureError(error)) return failure(INVALID_SIGNATURE, 400);
    // 500 so Stripe retries: a missing secret is ours to fix.
    console.error("Verifying a Stripe event failed:", error);
    return failure(SERVER_ERROR, 500);
  }

  try {
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    // The log is the only record of an event: there is no event table.
    console.error(`Stripe event ${event.id} (${event.type}) failed:`, error);
    return failure(SERVER_ERROR, 500);
  }
}
