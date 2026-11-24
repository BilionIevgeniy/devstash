import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { registerAccount, consumeIpRateLimit } = vi.hoisted(() => ({
  registerAccount: vi.fn(),
  consumeIpRateLimit: vi.fn(),
}));
// Outside a request scope; the service decides what runs later.
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en" }));
vi.mock("@/features/auth/services/registration", () => ({ registerAccount }));
vi.mock("@/lib/vendors/rate-limit", () => ({ consumeIpRateLimit }));
vi.mock("@/lib/http/app-url", () => ({
  getAppOrigin: () => "https://devstash.test",
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: vi.fn(async () => {}), warn: vi.fn(), info: vi.fn() },
}));

import { after } from "next/server";

import { POST } from "@/app/api/auth/register/route";
import { REGISTER_BY_IP } from "@/features/auth/domain/rate-limits";

const NOW = new Date("2026-11-24T12:00:00Z");
const INPUT = {
  name: "Ada",
  email: "ada@example.com",
  password: "a long password",
  confirmPassword: "a long password",
};

function call(body: unknown = INPUT) {
  return POST(
    // Another host than the app's own: an emailed link must not follow it.
    new Request("https://evil.test/api/auth/register", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "x-forwarded-for": "203.0.113.1" },
    }),
  );
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: NOW });
    consumeIpRateLimit.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a registration and answers with no data", async () => {
    const response = await call();

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: null,
      error: null,
    });
    expect(registerAccount).toHaveBeenCalledExactlyOnceWith(
      { name: "Ada", email: "ada@example.com", password: "a long password" },
      "https://devstash.test",
      "203.0.113.1",
      "en",
      after,
    );
  });

  it.each([
    ["no JSON", "{"],
    ["a short password", { ...INPUT, password: "x", confirmPassword: "x" }],
    ["no email", { ...INPUT, email: "nobody" }],
  ])("answers 400 for %s, before it counts an attempt", async (_name, body) => {
    const response = await call(body);

    expect(response.status).toBe(400);
    expect(consumeIpRateLimit).not.toHaveBeenCalled();
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("answers 429 with Retry-After when the client used up its attempts", async () => {
    consumeIpRateLimit.mockResolvedValue({
      success: false,
      reset: NOW.getTime() + 90_000,
    });

    const response = await call();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    expect(await response.json()).toMatchObject({
      error: "tooManyAttempts",
      params: { minutes: 2 },
    });
    expect(consumeIpRateLimit).toHaveBeenCalledWith(
      REGISTER_BY_IP,
      "203.0.113.1",
    );
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("registers nobody while the limiter is unavailable", async () => {
    consumeIpRateLimit.mockRejectedValue(new Error("down"));

    expect((await call()).status).toBe(500);
    expect(registerAccount).not.toHaveBeenCalled();
  });

  it("answers 500 when the registration failed", async () => {
    registerAccount.mockRejectedValue(new Error("down"));

    expect((await call()).status).toBe(500);
  });
});
