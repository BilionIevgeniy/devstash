import { describe, expect, it } from "vitest";

import {
  isAccountSwitchReason,
  isOtherAccount,
  switchAccountHref,
} from "@/features/auth/domain/account-switch";

describe("isOtherAccount", () => {
  it("is false without a session: the link leads to the sign-in page as usual", () => {
    expect(isOtherAccount(undefined, "b@example.com")).toBe(false);
    expect(isOtherAccount(null, "b@example.com")).toBe(false);
    expect(isOtherAccount("", "b@example.com")).toBe(false);
  });

  it("is false for the link's own account", () => {
    expect(isOtherAccount("B@example.com", "b@example.com")).toBe(false);
  });

  it("is true for a session of another address", () => {
    expect(isOtherAccount("a@example.com", "b@example.com")).toBe(true);
  });
});

describe("switchAccountHref", () => {
  it("names the reason in the query", () => {
    expect(switchAccountHref("password")).toBe(
      "/switch-account?reason=password",
    );
  });
});

describe("isAccountSwitchReason", () => {
  it("accepts only the known reasons", () => {
    expect(isAccountSwitchReason("email")).toBe(true);
    expect(isAccountSwitchReason("other")).toBe(false);
    expect(isAccountSwitchReason(["email"])).toBe(false);
  });
});
