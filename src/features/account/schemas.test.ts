import { describe, expect, it } from "vitest";

import { deleteAccountSchema } from "@/features/account/schemas";
import { MAX_PASSWORD_LENGTH } from "@/features/auth/domain/password-reset";

describe("deleteAccountSchema", () => {
  it("accepts a missing password, for accounts that have none", () => {
    expect(deleteAccountSchema.safeParse({}).success).toBe(true);
  });

  it("refuses a password longer than the maximum", () => {
    const result = deleteAccountSchema.safeParse({
      password: "a".repeat(MAX_PASSWORD_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts the token of a deletion link and refuses an empty one", () => {
    expect(deleteAccountSchema.safeParse({ token: "tok" }).success).toBe(true);
    expect(deleteAccountSchema.safeParse({ token: "" }).success).toBe(false);
  });
});
