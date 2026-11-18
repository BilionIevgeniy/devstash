import "server-only";

import { getStripeCustomerId } from "@/features/billing/_internal/queries";
import { syncSubscription } from "@/features/billing/_internal/services/subscription-sync";
import {
  checkoutSessionParams,
  planOpenSessions,
  type CheckoutSessionInput,
  type OpenCheckoutSession,
} from "@/features/billing/domain/checkout-session";
import { isProStatus } from "@/features/billing/domain/limits";
import { stripeIdOf } from "@/features/billing/domain/subscription";
import { getEntitlements } from "@/features/billing/queries";
import type { Plan } from "@/features/billing/schemas";
import type { Locale } from "@/i18n/config";
import { emailTranslator } from "@/i18n/email-translator";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { logger } from "@/lib/observability/logger";
import {
  LOCKED_TRANSACTION,
  lockForTransaction,
} from "@/lib/postgres/advisory-lock";
import { prisma } from "@/lib/postgres/prisma";
import {
  getStripe,
  isStripeCustomerMissing,
  isStripeNotFound,
} from "@/lib/vendors/stripe";

export type RedirectResult = OperationResult<{ url: string }>;

interface CheckoutUser {
  id: string;
  email?: string | null;
}

/** What the order step sends: the plan, and the language Stripe's page and the emails use. */
export interface CheckoutOrder {
  plan: Plan;
  locale: Locale;
}

type SessionInput = Omit<CheckoutSessionInput, "customer">;

function redirectTo(url: string): RedirectResult {
  return ok({ url });
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

async function listOpenSessions(
  customer: string,
): Promise<OpenCheckoutSession[]> {
  const { data } = await getStripe().checkout.sessions.list({
    customer,
    status: "open",
    limit: 10,
  });
  return data.map(({ id, url, metadata }) => ({ id, url, metadata }));
}

// A session that completed or expired in the meantime cannot be expired; the
// new one is made anyway, so a failure here only leaves the old risk.
async function expireSession(id: string): Promise<void> {
  try {
    await getStripe().checkout.sessions.expire(id);
  } catch (error) {
    logger.warn("Expiring an open Checkout session failed", {
      error,
      checkoutSessionId: id,
    });
  }
}

// Stripe is asked, not the row: a payment in another tab can be complete
// before its webhook or the return from Checkout has written the row.
async function hasLiveSubscription(customer: string): Promise<boolean> {
  const { data } = await getStripe().subscriptions.list({
    customer,
    limit: 10,
  });
  return data.some((subscription) => isProStatus(subscription.status));
}

// Under a lock per user, so two tabs that order at once see each other's
// session: the same plan reuses it, another plan expires it, and a customer
// who paid in another tab is refused (ADR 0032). Null: already Pro.
async function openSession(
  customer: string,
  input: SessionInput,
): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    await lockForTransaction(tx, `checkout:${input.userId}`);
    if (await hasLiveSubscription(customer)) return null;
    const { reuse, expire } = planOpenSessions(
      await listOpenSessions(customer),
      input.plan,
      input.consent.termsVersion,
    );
    if (reuse?.url) return reuse.url;
    await Promise.all(expire.map(expireSession));

    const session = await getStripe().checkout.sessions.create(
      checkoutSessionParams({ ...input, customer }),
    );
    if (!session.url) throw new Error("The Checkout session has no URL");
    return session.url;
  }, LOCKED_TRANSACTION);
}

export async function createCheckoutSession(
  user: CheckoutUser,
  order: CheckoutOrder,
  origin: string,
): Promise<RedirectResult> {
  const { isPro } = await getEntitlements(user.id);
  if (isPro) return fail("alreadyPro");

  // Before any customer write: a missing price must leave nothing behind.
  const now = new Date();
  const input: SessionInput = {
    userId: user.id,
    priceId: priceIdFor(order.plan),
    plan: order.plan,
    locale: order.locale,
    origin,
    // The schema let the order through only with the consent ticked.
    consent: { withdrawalWaiverAt: now, termsVersion: TERMS_VERSION },
    submitNote: emailTranslator(order.locale)("checkout.submitNote"),
    now,
  };
  const customer = await findOrCreateCustomer(user);

  let url: string | null;
  try {
    url = await openSession(customer, input);
  } catch (error) {
    if (!isStripeCustomerMissing(error)) throw error;
    // The stored customer is dead. No idempotency key, so customer-<userId>
    // cannot replay it, and saving the new id replaces the dead one.
    url = await openSession(await createCustomer(user), input);
  }
  return url ? redirectTo(url) : fail("alreadyPro");
}

export async function createPortalSession(
  userId: string,
  origin: string,
): Promise<RedirectResult> {
  const customer = await getStripeCustomerId(userId);
  if (!customer) return fail("noBillingAccount");

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
    return fail("noBillingAccount");
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
    return fail("paymentNotConfirmed");
  }

  const customerId = stripeIdOf(session.customer);
  const subscriptionId = stripeIdOf(session.subscription);
  if (!customerId || !subscriptionId) {
    return fail("paymentNotConfirmed");
  }

  await syncSubscription(customerId, subscriptionId);
  return ok();
}
