import { beforeEach, describe, expect, it, vi } from "vitest";

const { handleStripeEvent, constructStripeEvent, isStripeSignatureError } =
  vi.hoisted(() => ({
    handleStripeEvent: vi.fn(),
    constructStripeEvent: vi.fn(),
    isStripeSignatureError: vi.fn(),
  }));
const error = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/features/billing/services/webhook", () => ({ handleStripeEvent }));
vi.mock("@/lib/vendors/stripe", () => ({
  constructStripeEvent,
  isStripeSignatureError,
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error, warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

const EVENT = { id: "evt_1", type: "customer.subscription.updated" };

function call(signature: string | null = "t=1,v1=abc") {
  return POST(
    new Request("https://devstash.test/api/webhooks/stripe", {
      method: "POST",
      body: "the raw body",
      headers: signature ? { "stripe-signature": signature } : {},
    }),
  );
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    constructStripeEvent.mockReturnValue(EVENT);
    isStripeSignatureError.mockReturnValue(false);
  });

  it("verifies the raw body and hands the event on", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(constructStripeEvent).toHaveBeenCalledWith(
      "the raw body",
      "t=1,v1=abc",
    );
    expect(handleStripeEvent).toHaveBeenCalledExactlyOnceWith(EVENT);
  });

  it("answers 400 without a signature and reads nothing", async () => {
    const response = await call(null);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalidSignature" });
    expect(constructStripeEvent).not.toHaveBeenCalled();
  });

  it("answers 400 for a bad signature and handles nothing", async () => {
    constructStripeEvent.mockImplementation(() => {
      throw new Error("no match");
    });
    isStripeSignatureError.mockReturnValue(true);

    const response = await call();

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "invalidSignature" });
    expect(handleStripeEvent).not.toHaveBeenCalled();
  });

  // Stripe retries a 5xx and gives up on a 4xx.
  it("answers 500 when the secret is missing, so Stripe retries", async () => {
    constructStripeEvent.mockImplementation(() => {
      throw new Error("STRIPE_WEBHOOK_SECRET must be set");
    });

    const response = await call();

    expect(response.status).toBe(500);
    expect(handleStripeEvent).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledOnce();
  });

  it("answers 500 when the sync failed, so Stripe retries, and logs the event", async () => {
    handleStripeEvent.mockRejectedValue(new Error("database down"));

    const response = await call();

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledExactlyOnceWith(
      "Stripe event of type customer.subscription.updated failed",
      expect.objectContaining({ stripeEventId: "evt_1" }),
    );
  });
});
