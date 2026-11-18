import { describe, expect, it } from "vitest";
import { isForeignSignIn } from "@/features/auth/domain/foreign-sign-in";

describe("isForeignSignIn", () => {
  it("lets a sign-in through when no session is open", () => {
    expect(isForeignSignIn(undefined, "user-1")).toBe(false);
  });

  it("lets the session's own user through", () => {
    expect(isForeignSignIn("user-1", "user-1")).toBe(false);
  });

  it("refuses a different user", () => {
    expect(isForeignSignIn("user-1", "user-2")).toBe(true);
  });

  it("refuses a sign-in with no resolved user while a session is open", () => {
    expect(isForeignSignIn("user-1", undefined)).toBe(true);
  });
});
