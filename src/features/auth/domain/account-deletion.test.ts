import { describe, expect, it } from "vitest";

import {
  accountDeletionPath,
  buildAccountDeletionUrl,
  deletionLinkState,
  getAccountDeletionExpiry,
  getAccountDeletionIdentifier,
} from "@/features/auth/domain/account-deletion";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";

describe("getAccountDeletionIdentifier", () => {
  it("never collides with a verification or reset token of the address", () => {
    const email = "ada@example.com";
    expect(getAccountDeletionIdentifier(email)).toBe(
      "account-deletion:ada@example.com",
    );
    expect(getAccountDeletionIdentifier(email)).not.toBe(email);
    expect(getAccountDeletionIdentifier(email)).not.toBe(
      getPasswordResetIdentifier(email),
    );
  });
});

describe("getAccountDeletionExpiry", () => {
  it("expires one hour after now", () => {
    expect(
      getAccountDeletionExpiry(new Date("2026-01-15T12:00:00Z")).toISOString(),
    ).toBe("2026-01-15T13:00:00.000Z");
  });
});

describe("buildAccountDeletionUrl", () => {
  it("points at the confirmation page with the token and the email", () => {
    const url = new URL(
      buildAccountDeletionUrl(
        "https://devstash.example/any/path",
        "ada+x@example.com",
        "a/b+c",
      ),
    );
    expect(url.origin).toBe("https://devstash.example");
    expect(url.pathname).toBe("/settings/delete-account");
    expect(url.searchParams.get("token")).toBe("a/b+c");
    expect(url.searchParams.get("email")).toBe("ada+x@example.com");
  });
});

describe("accountDeletionPath", () => {
  it("is the page with the encoded query, for the sign-in to lead back to", () => {
    expect(accountDeletionPath("a+b@example.com", "t/1")).toBe(
      "/settings/delete-account?token=t%2F1&email=a%2Bb%40example.com",
    );
  });
});

describe("deletionLinkState", () => {
  const github = { email: "ada@example.com", hasPassword: false };

  it("offers the switch for a link of another address, whatever its token", () => {
    expect(deletionLinkState(github, "bob@example.com", true)).toBe(
      "otherAccount",
    );
  });

  it("confirms only a valid token of an account without a password", () => {
    expect(deletionLinkState(github, "ada@example.com", true)).toBe("valid");
    expect(deletionLinkState(github, "ada@example.com", false)).toBe("invalid");
    expect(
      deletionLinkState(
        { email: "ada@example.com", hasPassword: true },
        "ada@example.com",
        true,
      ),
    ).toBe("invalid");
  });
});
