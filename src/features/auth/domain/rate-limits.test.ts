import { describe, expect, it } from "vitest";
import * as rateLimits from "@/features/auth/domain/rate-limits";
import {
  getBlockingReset,
  getRetryAfterSeconds,
  getTooManyAttemptsMessage,
  RESET_EMAIL_BY_ADDRESS,
  TOO_MANY_ATTEMPTS_MESSAGE,
  VERIFICATION_EMAIL_BY_ADDRESS,
} from "@/features/auth/domain/rate-limits";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const NOW = 1_700_000_000_000;

interface Policy {
  name: string;
  limit: number;
  windowSeconds: number;
}

function isPolicy(value: unknown): value is Policy {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "limit" in value &&
    "windowSeconds" in value
  );
}

describe("rate limit policies", () => {
  const policies = (Object.values(rateLimits) as unknown[]).filter(isPolicy);

  it("finds the exported policies", () => {
    expect(policies.length).toBeGreaterThan(0);
  });

  // The limiter keys its counters by policy name, so a repeated name would
  // make two policies share one counter.
  it("gives every policy its own name", () => {
    const names = policies.map((policy) => policy.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("uses a positive whole limit and window for every policy", () => {
    for (const { name, limit, windowSeconds } of policies) {
      expect(Number.isInteger(limit) && limit > 0, name).toBe(true);
      expect(Number.isInteger(windowSeconds) && windowSeconds > 0, name).toBe(
        true,
      );
    }
  });

  it.each([VERIFICATION_EMAIL_BY_ADDRESS, RESET_EMAIL_BY_ADDRESS])(
    "allows one email per address per minute ($name)",
    (policy) => {
      expect(policy.limit).toBe(1);
      expect(policy.windowSeconds).toBe(60);
    },
  );

  it("keeps the generic message free of any time", () => {
    expect(TOO_MANY_ATTEMPTS_MESSAGE).toBe("Too many attempts. Try again later.");
  });
});

describe("getRetryAfterSeconds", () => {
  it("returns the whole seconds until the window ends", () => {
    expect(getRetryAfterSeconds(NOW + 30 * SECOND, NOW)).toBe(30);
  });

  it("rounds a partial second up", () => {
    expect(getRetryAfterSeconds(NOW + 1500, NOW)).toBe(2);
    expect(getRetryAfterSeconds(NOW + 1, NOW)).toBe(1);
  });

  it("never returns less than one second", () => {
    expect(getRetryAfterSeconds(NOW, NOW)).toBe(1);
    expect(getRetryAfterSeconds(NOW - 5 * SECOND, NOW)).toBe(1);
  });
});

describe("getTooManyAttemptsMessage", () => {
  it("says 1 minute, singular, for anything up to a minute", () => {
    const message = "Too many attempts. Please try again in 1 minute.";
    expect(getTooManyAttemptsMessage(NOW + 1 * SECOND, NOW)).toBe(message);
    expect(getTooManyAttemptsMessage(NOW + MINUTE, NOW)).toBe(message);
  });

  it("says 1 minute for a window that has already ended", () => {
    expect(getTooManyAttemptsMessage(NOW - MINUTE, NOW)).toBe(
      "Too many attempts. Please try again in 1 minute.",
    );
  });

  it("rounds up to whole minutes so the client never retries early", () => {
    expect(getTooManyAttemptsMessage(NOW + MINUTE + SECOND, NOW)).toBe(
      "Too many attempts. Please try again in 2 minutes.",
    );
  });

  it("uses the plural for a full window", () => {
    expect(getTooManyAttemptsMessage(NOW + 15 * MINUTE, NOW)).toBe(
      "Too many attempts. Please try again in 15 minutes.",
    );
  });
});

describe("getBlockingReset", () => {
  it("is null when there are no counters", () => {
    expect(getBlockingReset([])).toBeNull();
  });

  it("is null when no counter is known", () => {
    expect(getBlockingReset([null, null])).toBeNull();
  });

  it("is null while every counter has attempts left", () => {
    expect(
      getBlockingReset([
        { remaining: 3, reset: NOW + MINUTE },
        { remaining: 1, reset: NOW + 2 * MINUTE },
      ]),
    ).toBeNull();
  });

  it("returns the reset of the one counter that is used up", () => {
    expect(
      getBlockingReset([
        { remaining: 0, reset: NOW + MINUTE },
        { remaining: 4, reset: NOW + 9 * MINUTE },
      ]),
    ).toBe(NOW + MINUTE);
  });

  it("returns the latest reset when several counters are used up", () => {
    expect(
      getBlockingReset([
        { remaining: 0, reset: NOW + 2 * MINUTE },
        { remaining: 0, reset: NOW + 7 * MINUTE },
        { remaining: 0, reset: NOW + 4 * MINUTE },
      ]),
    ).toBe(NOW + 7 * MINUTE);
  });

  it("treats a negative remaining count as used up", () => {
    expect(getBlockingReset([{ remaining: -1, reset: NOW + MINUTE }])).toBe(
      NOW + MINUTE,
    );
  });

  it("skips counters that are unknown", () => {
    expect(
      getBlockingReset([null, { remaining: 0, reset: NOW + MINUTE }, null]),
    ).toBe(NOW + MINUTE);
  });
});
