import { describe, expect, it } from "vitest";

import { createQueryClient } from "@/components/common/query-client";
import { fail } from "@/lib/action-result";
import { RouteError } from "@/lib/route-error";

function retryRule() {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry !== "function") throw new Error("retry is not a rule");
  return retry;
}

describe("createQueryClient", () => {
  it("never retries a refusal of our route", () => {
    const retry = retryRule();
    expect(retry(0, new RouteError(404, fail("itemNotFound")))).toBe(false);
    expect(retry(0, new RouteError(401, fail("unauthorized")))).toBe(false);
  });

  it("retries a failure once", () => {
    const retry = retryRule();
    const failure = new RouteError(500, fail("serverError"));
    expect(retry(0, failure)).toBe(true);
    expect(retry(1, failure)).toBe(false);
    expect(retry(0, new TypeError("Failed to fetch"))).toBe(true);
  });
});
