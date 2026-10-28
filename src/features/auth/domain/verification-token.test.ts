import { describe, expect, it } from "vitest";
import {
  buildVerificationUrl,
  getTokenExpiry,
  isTokenExpired,
} from "@/features/auth/domain/verification-token";

const HOUR = 60 * 60 * 1000;
const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("getTokenExpiry", () => {
  it("expires 24 hours after now", () => {
    expect(getTokenExpiry(NOW).toISOString()).toBe("2026-01-16T12:00:00.000Z");
  });

  it("does not change the date it is given", () => {
    const now = new Date(NOW);
    getTokenExpiry(now);
    expect(now.getTime()).toBe(NOW.getTime());
  });
});

describe("isTokenExpired", () => {
  it("is true once the expiry is in the past", () => {
    expect(isTokenExpired(new Date(NOW.getTime() - 1), NOW)).toBe(true);
  });

  it("is false at the exact moment of expiry", () => {
    expect(isTokenExpired(NOW, NOW)).toBe(false);
  });

  it("is false while the expiry is in the future", () => {
    expect(isTokenExpired(new Date(NOW.getTime() + 1), NOW)).toBe(false);
  });

  it("holds for a token until its 24 hours are over, not a moment longer", () => {
    const expires = getTokenExpiry(NOW);
    expect(isTokenExpired(expires, new Date(NOW.getTime() + 24 * HOUR))).toBe(
      false,
    );
    expect(isTokenExpired(expires, new Date(NOW.getTime() + 24 * HOUR + 1))).toBe(
      true,
    );
  });
});

describe("buildVerificationUrl", () => {
  const ORIGIN = "https://devstash.example";

  it("points at /verify-email with the token and the email", () => {
    const url = new URL(buildVerificationUrl(ORIGIN, "ada@example.com", "abc123"));
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("/verify-email");
    expect(url.searchParams.get("token")).toBe("abc123");
    expect(url.searchParams.get("email")).toBe("ada@example.com");
  });

  // A literal "+" in a query string is read back as a space.
  it("encodes a plus sign in the email", () => {
    const link = buildVerificationUrl(ORIGIN, "ada+test@example.com", "abc123");
    expect(link).toContain("email=ada%2Btest%40example.com");
    expect(new URL(link).searchParams.get("email")).toBe("ada+test@example.com");
  });

  it("encodes characters in the token that would break the query", () => {
    const link = buildVerificationUrl(ORIGIN, "ada@example.com", "a/b+c=d&e");
    expect(new URL(link).searchParams.get("token")).toBe("a/b+c=d&e");
  });

  it("keeps the port of the origin", () => {
    const link = buildVerificationUrl("http://localhost:3000", "a@b.co", "t");
    expect(new URL(link).origin).toBe("http://localhost:3000");
  });

  it("replaces any path on the origin", () => {
    const link = buildVerificationUrl(`${ORIGIN}/some/path`, "a@b.co", "t");
    expect(new URL(link).pathname).toBe("/verify-email");
  });
});
