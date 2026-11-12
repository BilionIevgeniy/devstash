import { notFound, redirect } from "next/navigation";
import { describe, expect, it } from "vitest";

import { isNavigationError } from "@/lib/navigation-error";

// The real errors Next throws, not stand-ins: the check must follow Next.
function thrownBy(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the call to throw");
}

describe("isNavigationError", () => {
  it("is true for a redirect", () => {
    expect(isNavigationError(thrownBy(() => redirect("/sign-in")))).toBe(true);
  });

  it("is true for notFound", () => {
    expect(isNavigationError(thrownBy(() => notFound()))).toBe(true);
  });

  it("is true for an error caused by a redirect", () => {
    const cause = thrownBy(() => redirect("/sign-in"));
    expect(isNavigationError(new Error("wrapped", { cause }))).toBe(true);
  });

  it("is false for any other failure", () => {
    expect(isNavigationError(new Error("Failed to fetch"))).toBe(false);
    expect(isNavigationError("text")).toBe(false);
    expect(isNavigationError(null)).toBe(false);
  });
});
