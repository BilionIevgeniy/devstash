import "server-only";

import { getStripeCustomerId } from "@/features/billing/_internal/queries";
import { syncSubscription } from "@/features/billing/_internal/services/subscription-sync";
import { stripeIdOf } from "@/features/billing/domain/subscription";
import { getEntitlements } from "@/features/billing/queries";
import type { Plan } from "@/features/billing/schemas";
import type { OperationResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  getStripe,
  isStripeCustomerMissing,
  isStripeNotFound,
} from "@/lib/stripe";

const ALREADY_PRO = "You are already on the Pro plan.";
const NO_BILLING_ACCOUNT = "No billing account was found.";
const NOT_CONFIRMED = "This payment could not be confirmed.";

export interface RedirectResult extends OperationResult {
  data: { url: string } | null;
}

interface CheckoutUser {
  id: string;
  email?: string | null;
}

interface SessionInput {
  userId: string;
  priceId: string;
  origin: string;
}

function failure(error: string): RedirectResult {
  return { success: false, data: null, error };
}

function redirectTo(url: string): RedirectResult {
  return { success: true, data: { url }, error: null };
}

function priceIdFor(plan: Plan): string {
  const id =
    plan === "monthly"
      ? process.env.STRIPE_PRICE_ID_MONTHLY
      : process.env.STRIPE_PRICE_ID_YEARLY;
  if (!id) throw new Error(`The Stripe price for ${plan} is not set`);
  return id;
}

// The row exists before Checkout, so the webhook finds it by customer id. The
// update writes only the customer: the status belongs to the sync.
async function saveCustomer(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, status: "incomplete", stripeCustomerId },
    update: { stripeCustomerId },
  });
}

async function createCustomer(
  user: CheckoutUser,
  idempotencyKey?: string,
): Promise<string> {
  const customer = await getStripe().customers.create(
    { email: user.email ?? undefined, metadata: { userId: user.id } },
    idempotencyKey ? { idempotencyKey } : undefined,
  );
  await saveCustomer(user.id, customer.id);
  return customer.id;
}

async function findOrCreateCustomer(user: CheckoutUser): Promise<string> {
  const stored = await getStripeCustomerId(user.id);
  return stored ?? createCustomer(user, `customer-${user.id}`);
}

async function createSession(
  customer: string,
  { userId, priceId, origin }: SessionInput,
): Promise<string> {
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId },
    success_url: `${origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/settings`,
  });
  if (!session.url) throw new Error("The Checkout session has no URL");
  return session.url;
}

export async function createCheckoutSession(
  user: CheckoutUser,
  plan: Plan,
  origin: string,
): Promise<RedirectResult> {
  const { isPro } = await getEntitlements(user.id);
  if (isPro) return failure(ALREADY_PRO);

  // Before any customer write: a missing price must leave nothing behind.
  const input = { userId: user.id, priceId: priceIdFor(plan), origin };
  const customer = await findOrCreateCustomer(user);

  try {
    return redirectTo(await createSession(customer, input));
  } catch (error) {
    if (!isStripeCustomerMissing(error)) throw error;
  }

  // The stored customer is dead. No idempotency key, so customer-<userId>
  // cannot replay it, and saving the new id replaces the dead one.
  return redirectTo(await createSession(await createCustomer(user), input));
}

export async function createPortalSession(
  userId: string,
  origin: string,
): Promise<RedirectResult> {
  const customer = await getStripeCustomerId(userId);
  if (!customer) return failure(NO_BILLING_ACCOUNT);

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer,
      return_url: `${origin}/settings`,
    });
    return redirectTo(session.url);
  } catch (error) {
    if (!isStripeCustomerMissing(error)) throw error;

    // The id stays: the webhook finds the row only by it, and clearing it could
    // leave a Pro row that no later event can end.
    logger.warn("The Stripe customer of a user is missing", { userId });
    return failure(NO_BILLING_ACCOUNT);
  }
}

async function retrieveCheckoutSession(sessionId: string) {
  try {
    return await getStripe().checkout.sessions.retrieve(sessionId);
  } catch (error) {
    if (isStripeNotFound(error)) return null;
    throw error;
  }
}

// The return from Checkout, when the webhook has not arrived yet. The id comes
// from the URL, so the session must be the caller's and finished.
export async function confirmCheckoutSession(
  userId: string,
  sessionId: string,
): Promise<OperationResult> {
  const session = await retrieveCheckoutSession(sessionId);
  if (session?.metadata?.userId !== userId || session.status !== "complete") {
    return { success: false, error: NOT_CONFIRMED };
  }

  const customerId = stripeIdOf(session.customer);
  const subscriptionId = stripeIdOf(session.subscription);
  if (!customerId || !subscriptionId) {
    return { success: false, error: NOT_CONFIRMED };
  }

  await syncSubscription(customerId, subscriptionId);
  return { success: true, error: null };
}
