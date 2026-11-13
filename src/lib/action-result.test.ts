import { describe, expect, it } from "vitest";

import { toErrorRef } from "@/i18n/error-codes";
import { fail, ok } from "@/lib/action-result";

// The JSON shape the browser and the routes read: every key is always there.
describe("ok", () => {
  it("carries the data with no error", () => {
    expect(ok({ id: "item-1" })).toEqual({
      success: true,
      data: { id: "item-1" },
      error: null,
    });
  });

  it("carries null when there is nothing to return", () => {
    expect(ok()).toEqual({ success: true, data: null, error: null });
  });
});

describe("fail", () => {
  it("carries the code with no data", () => {
    expect(fail("itemNotFound")).toEqual({
      success: false,
      data: null,
      error: "itemNotFound",
    });
  });
});

describe("fail with params", () => {
  it("carries the params a message needs, and leaves the key out without any", () => {
    expect(fail("tooManyAttempts", { minutes: 3 })).toEqual({
      success: false,
      data: null,
      error: "tooManyAttempts",
      params: { minutes: 3 },
    });
    expect(fail("generic")).not.toHaveProperty("params");
  });
});

describe("toErrorRef", () => {
  it("keeps only the code and the params of a failure", () => {
    expect(toErrorRef(fail("itemLimitReached", { limit: 50 }))).toEqual({
      error: "itemLimitReached",
      params: { limit: 50 },
    });
    expect(toErrorRef(fail("generic"))).toEqual({ error: "generic" });
  });
});
