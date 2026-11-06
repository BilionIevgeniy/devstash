import "server-only";

import Stripe from "stripe";

export type StripeEvent = Stripe.Event;
export type StripeSubscription = Stripe.Subscription;

let client: Stripe | undefined;

// Created on first use so a build never needs the key.
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client = new Stripe(key);
  return client;
}

// A missing secret throws a plain Error, so the route answers 500 and Stripe
// retries. Only a bad signature is the caller's fault.
export function constructStripeEvent(
  rawBody: string,
  signature: string,
): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

export function isStripeSignatureError(error: unknown): boolean {
  return error instanceof Stripe.errors.StripeSignatureVerificationError;
}

export function isStripeNotFound(
  error: unknown,
): error is Stripe.errors.StripeInvalidRequestError {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

// Stripe answers resource_missing for any id it cannot find, a wrong price id
// too, and only param tells them apart.
export function isStripeCustomerMissing(error: unknown): boolean {
  return isStripeNotFound(error) && error.param === "customer";
}
