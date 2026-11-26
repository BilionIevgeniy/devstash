import { describe, expect, it } from "vitest";

import { consumeLocalRateLimit } from "@/lib/vendors/local-rate-limit";

const POLICY = { name: "test:local", limit: 2, windowSeconds: 60 };

describe("consumeLocalRateLimit", () => {
  it("allows exactly the limit within a window", () => {
    const now = 1_000;
    expect(consumeLocalRateLimit(POLICY, "a", now)).toBe(true);
    expect(consumeLocalRateLimit(POLICY, "a", now)).toBe(true);
    expect(consumeLocalRateLimit(POLICY, "a", now)).toBe(false);
  });

  it("starts a new window once the old one ends", () => {
    const now = 10_000_000;
    consumeLocalRateLimit(POLICY, "b", now);
    consumeLocalRateLimit(POLICY, "b", now);
    expect(consumeLocalRateLimit(POLICY, "b", now + 60_000)).toBe(true);
  });

  it("counts each identifier and each policy on its own", () => {
    const now = 20_000_000;
    consumeLocalRateLimit(POLICY, "c", now);
    consumeLocalRateLimit(POLICY, "c", now);
    expect(consumeLocalRateLimit(POLICY, "d", now)).toBe(true);
    expect(
      consumeLocalRateLimit({ ...POLICY, name: "test:other" }, "c", now),
    ).toBe(true);
  });

  it("keeps its memory bounded by dropping the oldest keys", () => {
    const now = 30_000_000;
    consumeLocalRateLimit(POLICY, "oldest", now);
    consumeLocalRateLimit(POLICY, "oldest", now);
    for (let i = 0; i < 10_000; i += 1) {
      consumeLocalRateLimit(POLICY, `filler-${i}`, now);
    }
    // The oldest key was dropped, so it starts over.
    expect(consumeLocalRateLimit(POLICY, "oldest", now)).toBe(true);
  });
});

describe("the window of consumeLocalRateLimit", () => {
  it("lasts its seconds, not less", () => {
    const now = 30_000_000;
    consumeLocalRateLimit(POLICY, "e", now);
    consumeLocalRateLimit(POLICY, "e", now);
    expect(consumeLocalRateLimit(POLICY, "e", now + 59_999)).toBe(false);
  });

  it("forgets the oldest key only once it holds 10,000", () => {
    const now = 40_000_000;
    consumeLocalRateLimit(POLICY, "kept", now);
    consumeLocalRateLimit(POLICY, "kept", now);
    consumeLocalRateLimit(POLICY, "next", now);
    expect(consumeLocalRateLimit(POLICY, "kept", now)).toBe(false);
    for (let i = 0; i < 10_000; i++) {
      consumeLocalRateLimit(POLICY, `filler-${i}`, now);
    }
    expect(consumeLocalRateLimit(POLICY, "kept", now)).toBe(true);
  });
});
