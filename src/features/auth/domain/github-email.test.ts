import { describe, expect, it } from "vitest";

import { pickVerifiedEmail } from "@/features/auth/domain/github-email";

describe("pickVerifiedEmail", () => {
  it("takes the primary address when GitHub has verified it", () => {
    expect(
      pickVerifiedEmail([
        { email: "old@example.com", primary: false, verified: true },
        { email: "ada@example.com", primary: true, verified: true },
      ]),
    ).toBe("ada@example.com");
  });

  it("refuses an unverified primary, even with a verified other address", () => {
    expect(
      pickVerifiedEmail([
        { email: "victim@example.com", primary: true, verified: false },
        { email: "own@example.com", primary: false, verified: true },
      ]),
    ).toBeNull();
  });

  it("answers null for anything that is not a list of addresses", () => {
    expect(pickVerifiedEmail({ message: "Bad credentials" })).toBeNull();
    expect(pickVerifiedEmail([null, "x"])).toBeNull();
  });
});
