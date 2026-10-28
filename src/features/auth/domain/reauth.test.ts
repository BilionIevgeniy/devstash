import { describe, expect, it } from "vitest";
import {
  isRecentlyAuthenticated,
  REAUTH_WINDOW_MS,
  requiresReauthentication,
} from "@/features/auth/domain/reauth";

const NOW = 1_700_000_000_000;

describe("isRecentlyAuthenticated", () => {
  it("is false when the sign-in time is unknown", () => {
    expect(isRecentlyAuthenticated(undefined, NOW)).toBe(false);
  });

  it("is true for a sign-in that just happened", () => {
    expect(isRecentlyAuthenticated(NOW, NOW)).toBe(true);
  });

  it("is true exactly at the edge of the window", () => {
    expect(isRecentlyAuthenticated(NOW - REAUTH_WINDOW_MS, NOW)).toBe(true);
  });

  it("is false one millisecond after the window", () => {
    expect(isRecentlyAuthenticated(NOW - REAUTH_WINDOW_MS - 1, NOW)).toBe(false);
  });

  it("reads a timestamp of 0 as a real time, not as missing", () => {
    expect(isRecentlyAuthenticated(0, 0)).toBe(true);
    expect(isRecentlyAuthenticated(0, REAUTH_WINDOW_MS + 1)).toBe(false);
  });
});

describe("requiresReauthentication", () => {
  it("never asks an account with a password", () => {
    expect(requiresReauthentication(true, undefined, NOW)).toBe(false);
    expect(requiresReauthentication(true, NOW - 10 * REAUTH_WINDOW_MS, NOW)).toBe(
      false,
    );
    expect(requiresReauthentication(true, NOW, NOW)).toBe(false);
  });

  it("asks an account without a password that has no sign-in time", () => {
    expect(requiresReauthentication(false, undefined, NOW)).toBe(true);
  });

  it("asks an account without a password whose sign-in is too old", () => {
    expect(
      requiresReauthentication(false, NOW - REAUTH_WINDOW_MS - 1, NOW),
    ).toBe(true);
  });

  it("lets an account without a password through after a recent sign-in", () => {
    expect(requiresReauthentication(false, NOW - REAUTH_WINDOW_MS, NOW)).toBe(
      false,
    );
    expect(requiresReauthentication(false, NOW, NOW)).toBe(false);
  });
});
