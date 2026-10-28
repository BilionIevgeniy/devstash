import { describe, expect, it } from "vitest";
import { shouldResendVerification } from "@/features/auth/domain/registration";

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
