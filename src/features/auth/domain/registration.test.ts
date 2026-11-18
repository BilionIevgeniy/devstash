import { describe, expect, it } from "vitest";
import {
  shouldResendVerification,
  staleRegistrationCutoff,
  UNVERIFIED_REGISTRATION_DAYS,
} from "@/features/auth/domain/registration";

describe("shouldResendVerification", () => {
  // A repeat registration must reveal nothing about other kinds of account, so
  // only a credentials account that is still unverified gets a fresh link.
  it.each([
    { hasPassword: true, isEmailVerified: false, expected: true },
    { hasPassword: true, isEmailVerified: true, expected: false },
    { hasPassword: false, isEmailVerified: false, expected: false },
    { hasPassword: false, isEmailVerified: true, expected: false },
  ])(
    "hasPassword $hasPassword, isEmailVerified $isEmailVerified: $expected",
    ({ hasPassword, isEmailVerified, expected }) => {
      expect(shouldResendVerification({ hasPassword, isEmailVerified })).toBe(
        expected,
      );
    },
  );
});

describe("staleRegistrationCutoff", () => {
  it("lies the stated number of days before now", () => {
    expect(UNVERIFIED_REGISTRATION_DAYS).toBe(7);
    expect(
      staleRegistrationCutoff(new Date("2026-11-18T03:00:00Z")).toISOString(),
    ).toBe("2026-11-11T03:00:00.000Z");
  });
});
