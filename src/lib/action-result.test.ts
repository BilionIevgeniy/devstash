import { describe, expect, it } from "vitest";

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
  it("carries the message with no data", () => {
    expect(fail("Item not found")).toEqual({
      success: false,
      data: null,
      error: "Item not found",
    });
  });
});
