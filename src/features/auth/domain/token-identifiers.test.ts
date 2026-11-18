import { describe, expect, it } from "vitest";

import { addressTokenIdentifiers } from "@/features/auth/domain/token-identifiers";

describe("addressTokenIdentifiers", () => {
  it("names the three kinds of token of an address, all different", () => {
    const identifiers = addressTokenIdentifiers("ada@example.com");
    expect(identifiers).toEqual([
      "ada@example.com",
      "password-reset:ada@example.com",
      "account-deletion:ada@example.com",
    ]);
    expect(new Set(identifiers).size).toBe(identifiers.length);
  });
});
