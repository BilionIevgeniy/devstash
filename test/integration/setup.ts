import { vi } from "vitest";
import { requireTestDatabase } from "../../scripts/require-dev-database";

// A second guard, in every worker: the tests empty the database that
// DATABASE_URL names, so a worker refuses on its own if it ever gets anything
// but a test database, whatever the global setup did.
requireTestDatabase(process.env.DATABASE_URL);

// Only Prisma is real in the integration tests. Every outside boundary is
// replaced here, for every file: Upstash, R2, Resend, Stripe and OpenAI. Each
// factory exports
// every name its importers use. Implementations are passed to `vi.fn(impl)`,
// which `mockReset` restores before each test; a test that needs another
// answer sets it itself. Nothing here imports Prisma: the worker's
// DATABASE_URL comes from vitest.integration.config.mts. The mocks are hoisted
// above the guard; they import nothing real, so the order does not matter.

vi.mock("@/lib/vendors/rate-limit", () => {
  class RateLimitUnavailableError extends Error {
    constructor(options?: ErrorOptions) {
      super("Rate limiting is unavailable", options);
      this.name = "RateLimitUnavailableError";
    }
  }
  const allowed = async () => ({ success: true, remaining: 99, reset: 0 });
  return {
    RateLimitUnavailableError,
    consumeRateLimit: vi.fn(allowed),
    consumeIpRateLimit: vi.fn(allowed),
    resetRateLimit: vi.fn(async () => {}),
    getRateLimitStatus: vi.fn(async () => ({ remaining: 99, reset: 0 })),
    getIpRateLimitStatus: vi.fn(async () => null),
  };
});

// No object exists until a test says so with `headObject`.
vi.mock("@/lib/vendors/r2", () => ({
  signPutUrl: vi.fn(async (key: string) => `https://r2.test/put/${key}`),
  signGetUrl: vi.fn(async (key: string) => `https://r2.test/get/${key}`),
  headObject: vi.fn(async () => null),
  deleteObject: vi.fn(async () => {}),
  deletePrefix: vi.fn(async () => {}),
  listObjectsPage: vi.fn(async () => ({ objects: [], next: undefined })),
  deleteObjects: vi.fn(async () => {}),
}));

vi.mock("@/lib/vendors/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true, data: null, error: null })),
}));

// A test that reaches Stripe sets `getStripe` to the client it needs; the
// default throws, so an unplanned call fails the test loudly.
vi.mock("@/lib/vendors/stripe", () => ({
  getStripe: vi.fn(() => {
    throw new Error("Stripe is mocked: set getStripe in the test");
  }),
  isStripeTestMode: vi.fn(() => true),
  constructStripeEvent: vi.fn(() => {
    throw new Error("Stripe is mocked: build the event in the test");
  }),
  isStripeSignatureError: vi.fn(() => false),
  isStripeNotFound: vi.fn(() => false),
  isStripeCustomerMissing: vi.fn(() => false),
}));

vi.mock("@/lib/vendors/openai", () => {
  class AiOutputError extends Error {
    readonly reason: string;
    constructor(reason: string, options?: ErrorOptions) {
      super(`The model gave no usable output (${reason})`, options);
      this.name = "AiOutputError";
      this.reason = reason;
    }
  }
  const unavailable = () => {
    throw new Error("OpenAI is mocked in the integration tests");
  };
  return {
    AiOutputError,
    generateStructured: vi.fn(async () => unavailable()),
    streamText: vi.fn(unavailable),
    isAiSpendError: vi.fn(() => false),
    aiErrorKind: vi.fn(() => null),
  };
});

// Any other network call is a mistake in a test of the database.
vi.stubGlobal(
  "fetch",
  vi.fn(async () => {
    throw new Error("fetch is not allowed in the integration tests");
  }),
);
