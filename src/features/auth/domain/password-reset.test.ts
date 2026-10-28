import { describe, expect, it } from "vitest";
import {
  buildPasswordResetUrl,
  getPasswordResetExpiry,
  getPasswordResetIdentifier,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";

const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("getPasswordResetExpiry", () => {
  it("expires 1 hour after now", () => {
    expect(getPasswordResetExpiry(NOW).toISOString()).toBe(
      "2026-01-15T13:00:00.000Z",
    );
  });

  it("does not change the date it is given", () => {
    const now = new Date(NOW);
    getPasswordResetExpiry(now);
    expect(now.getTime()).toBe(NOW.getTime());
  });
});

describe("getPasswordResetIdentifier", () => {
  // Reset tokens share the VerificationToken table with email verification, so
  // the prefix keeps one kind of token from replacing the other.
  it("prefixes the email so it never collides with a verification token", () => {
    expect(getPasswordResetIdentifier("ada@example.com")).toBe(
      "password-reset:ada@example.com",
    );
  });
});

describe("buildPasswordResetUrl", () => {
  const ORIGIN = "https://devstash.example";

  it("points at /reset-password with the token and the email", () => {
    const url = new URL(buildPasswordResetUrl(ORIGIN, "ada@example.com", "abc123"));
    expect(url.origin).toBe(ORIGIN);
    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("token")).toBe("abc123");
    expect(url.searchParams.get("email")).toBe("ada@example.com");
  });

  it("encodes a plus sign in the email", () => {
    const link = buildPasswordResetUrl(ORIGIN, "ada+test@example.com", "abc123");
    expect(link).toContain("email=ada%2Btest%40example.com");
    expect(new URL(link).searchParams.get("email")).toBe("ada+test@example.com");
  });

  it("encodes characters in the token that would break the query", () => {
    const link = buildPasswordResetUrl(ORIGIN, "ada@example.com", "a/b+c=d&e");
    expect(new URL(link).searchParams.get("token")).toBe("a/b+c=d&e");
  });

  it("replaces any path on the origin", () => {
    const link = buildPasswordResetUrl(`${ORIGIN}/some/path`, "a@b.co", "t");
    expect(new URL(link).pathname).toBe("/reset-password");
  });
});

describe("password length bounds", () => {
  it("keeps the 8 to 72 range that the schemas and bcrypt rely on", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(MAX_PASSWORD_LENGTH).toBe(72);
  });
});
