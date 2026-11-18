// The one place the Checkout session is shaped (ADR 0032): the consent, the
// button, tax and the payment methods are added here, never forked per caller.

/** At least 30 minutes after Stripe creates the session; our clock runs first. */
export const CHECKOUT_SESSION_LIFETIME_MS = 60 * 60 * 1000;

export interface CheckoutConsent {
  /** When the § 356 (5) BGB consent was given at the order step. */
  withdrawalWaiverAt: Date;
  /** The version of the terms accepted with it (`TERMS_VERSION`). */
  termsVersion: string;
}

export interface CheckoutSessionInput {
  customer: string;
  priceId: string;
  plan: string;
  userId: string;
  locale: string;
  origin: string;
  consent: CheckoutConsent;
  /** Shown next to Stripe's button: clicking it orders with an obligation to pay. */
  submitNote: string;
  now: Date;
}

/** What the session and its subscription carry, all strings (Stripe metadata). */
export type CheckoutMetadata = Record<
  "userId" | "locale" | "plan" | "termsVersion" | "withdrawalWaiverAt",
  string
>;

export function checkoutMetadata(
  input: Pick<CheckoutSessionInput, "userId" | "locale" | "plan" | "consent">,
): CheckoutMetadata {
  return {
    userId: input.userId,
    locale: input.locale,
    plan: input.plan,
    termsVersion: input.consent.termsVersion,
    withdrawalWaiverAt: input.consent.withdrawalWaiverAt.toISOString(),
  };
}

// The parameters of `checkout.sessions.create`. Plain data: the service hands
// it to Stripe, whose type checks it there.
export function checkoutSessionParams(input: CheckoutSessionInput) {
  const metadata = checkoutMetadata(input);
  return {
    mode: "subscription" as const,
    customer: input.customer,
    line_items: [{ price: input.priceId, quantity: 1 }],
    metadata,
    // The subscription keeps the consent, so the sync and the confirmation
    // read it from there long after the session is gone.
    subscription_data: { metadata },
    allowed_payment_method_types: ["card" as const],
    automatic_tax: { enabled: true },
    tax_id_collection: { enabled: true },
    billing_address_collection: "required" as const,
    // Stripe Tax needs the address on the customer, and tax ids its name.
    customer_update: { address: "auto" as const, name: "auto" as const },
    custom_text: { submit: { message: input.submitNote } },
    locale: input.locale === "de" ? ("de" as const) : ("en" as const),
    expires_at: Math.floor(
      (input.now.getTime() + CHECKOUT_SESSION_LIFETIME_MS) / 1000,
    ),
    success_url: `${input.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}/settings`,
  };
}

export interface OpenCheckoutSession {
  id: string;
  url: string | null;
  metadata: Record<string, string> | null;
}

export interface OpenSessionPlan {
  /** An open session for the same plan and terms: its URL is handed out again. */
  reuse: OpenCheckoutSession | null;
  /** Every other open session of the customer: expired before a new one. */
  expire: string[];
}

// Two tabs that open Checkout end on one session, and so one subscription:
// an open session for the same plan and terms is reused, any other is expired.
export function planOpenSessions(
  open: OpenCheckoutSession[],
  plan: string,
  termsVersion: string,
): OpenSessionPlan {
  const reuse =
    open.find(
      (session) =>
        session.url !== null &&
        session.metadata?.plan === plan &&
        session.metadata?.termsVersion === termsVersion,
    ) ?? null;
  return {
    reuse,
    expire: open
      .filter((session) => session.id !== reuse?.id)
      .map((session) => session.id),
  };
}
