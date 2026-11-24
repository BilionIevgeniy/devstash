import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { limit, resetUsedTokens, getRemaining, created, error, warn } =
  vi.hoisted(() => ({
    limit: vi.fn(),
    resetUsedTokens: vi.fn(),
    getRemaining: vi.fn(),
    created: vi.fn(),
    error: vi.fn(async () => {}),
    warn: vi.fn(),
  }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow(tokens: number, window: string) {
      return { tokens, window };
    }
    constructor(options: unknown) {
      created(options);
    }
    limit = limit;
    resetUsedTokens = resetUsedTokens;
    getRemaining = getRemaining;
  },
}));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error, warn, info: vi.fn() },
}));

import { hmacSha256Hex } from "@/lib/hash";

const POLICY = { name: "test:user", limit: 5, windowSeconds: 60 } as const;
const KEY = "a-hash-key-of-at-least-32-characters";
const ALLOWED = { success: true, remaining: 4, reset: 1_000 };

// A fresh module per test: it keeps its limiters and the "warned" flag.
async function load() {
  vi.resetModules();
  return import("@/lib/vendors/rate-limit");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.test");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
  vi.stubEnv("RATE_LIMIT_HASH_KEY", KEY);
  limit.mockResolvedValue(ALLOWED);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("consumeRateLimit", () => {
  it("hands on the answer and counts a keyed hash, never the identifier", async () => {
    const { consumeRateLimit } = await load();

    await expect(consumeRateLimit(POLICY, "ada@example.com")).resolves.toEqual(
      ALLOWED,
    );
    // Not a plain hash: one could be reversed by trying every address.
    expect(limit).toHaveBeenCalledExactlyOnceWith(
      hmacSha256Hex(KEY, "ada@example.com"),
    );
  });

  it("limits as the policy says", async () => {
    const { consumeRateLimit } = await load();

    await consumeRateLimit(POLICY, "a");

    expect(created).toHaveBeenCalledWith(
      expect.objectContaining({ limiter: { tokens: 5, window: "60 s" } }),
    );
  });

  it("keeps one limiter per policy, its counters apart by prefix", async () => {
    const { consumeRateLimit } = await load();

    await consumeRateLimit(POLICY, "a");
    await consumeRateLimit(POLICY, "b");
    await consumeRateLimit({ ...POLICY, name: "other" }, "a");

    expect(created.mock.calls.map(([options]) => options.prefix)).toEqual([
      "ratelimit:test:user",
      "ratelimit:other",
    ]);
  });

  // The library answers success: true when Upstash does not answer in time.
  it("fails closed on the library's timeout", async () => {
    limit.mockResolvedValue({ ...ALLOWED, reason: "timeout" });
    const { consumeRateLimit, RateLimitUnavailableError } = await load();

    await expect(consumeRateLimit(POLICY, "a")).rejects.toBeInstanceOf(
      RateLimitUnavailableError,
    );
    expect(error).toHaveBeenCalledOnce();
  });

  it("fails closed when the call throws", async () => {
    limit.mockRejectedValue(new Error("network"));
    const { consumeRateLimit, RateLimitUnavailableError } = await load();

    await expect(consumeRateLimit(POLICY, "a")).rejects.toBeInstanceOf(
      RateLimitUnavailableError,
    );
  });

  it.each(["", "short", "x".repeat(31)])(
    "fails closed with the hash key %j, and nothing reaches Upstash",
    async (key) => {
      vi.stubEnv("RATE_LIMIT_HASH_KEY", key);
      const { consumeRateLimit, isRateLimitConfigured } = await load();

      await expect(consumeRateLimit(POLICY, "a")).rejects.toThrow(
        "Rate limiting is unavailable",
      );
      expect(limit).not.toHaveBeenCalled();
      expect(isRateLimitConfigured()).toBe(false);
    },
  );

  it("fails closed without the Upstash credentials", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const { consumeRateLimit, isRateLimitConfigured } = await load();

    await expect(consumeRateLimit(POLICY, "a")).rejects.toThrow(
      "Rate limiting is unavailable",
    );
    expect(isRateLimitConfigured()).toBe(false);
  });

  it("counts as configured with a key of 32 characters", async () => {
    vi.stubEnv("RATE_LIMIT_HASH_KEY", "x".repeat(32));
    const { isRateLimitConfigured } = await load();

    expect(isRateLimitConfigured()).toBe(true);
  });
});

describe("consumeIpRateLimit", () => {
  // One shared counter for every request with no address would let one client
  // lock everyone out.
  it("lets a request with no address through, uncounted, and warns once", async () => {
    const { consumeIpRateLimit } = await load();

    const first = await consumeIpRateLimit(POLICY, null);
    const second = await consumeIpRateLimit(POLICY, null);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(limit).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("counts an address like any identifier, and refuses when it is used up", async () => {
    limit.mockResolvedValue({ success: false, remaining: 0, reset: 9 });
    const { consumeIpRateLimit, consumeRateLimit } = await load();

    await expect(
      consumeIpRateLimit(POLICY, "203.0.113.1"),
    ).resolves.toMatchObject({ success: false });

    // An account with no address in its request is still counted.
    await expect(consumeRateLimit(POLICY, "user-1")).resolves.toMatchObject({
      success: false,
    });
  });
});

describe("what does not decide access", () => {
  it("a failed status is null, and no address has no status", async () => {
    getRemaining.mockRejectedValue(new Error("network"));
    const { getRateLimitStatus, getIpRateLimitStatus } = await load();

    await expect(getRateLimitStatus(POLICY, "a")).resolves.toBeNull();
    await expect(getIpRateLimitStatus(POLICY, null)).resolves.toBeNull();
    expect(error).toHaveBeenCalledOnce();
  });

  it("a failed reset is logged and does not fail the caller", async () => {
    resetUsedTokens.mockRejectedValue(new Error("network"));
    const { resetRateLimit } = await load();

    await expect(resetRateLimit(POLICY, "a")).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
  });
});
