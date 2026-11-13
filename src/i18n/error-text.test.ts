import { describe, expect, it, vi } from "vitest";

import { ERROR_PARAM_NAMES, type ErrorCode } from "@/i18n/error-codes";
import { createErrorText } from "@/i18n/error-text";
import errors from "@/i18n/messages/en/errors.json";

const GENERIC = errors.generic;

describe("createErrorText", () => {
  it.each(Object.keys(errors) as ErrorCode[])(
    "formats %s with its params and reports nothing",
    (code) => {
      const onError = vi.fn();
      const names: readonly string[] =
        (ERROR_PARAM_NAMES as Record<string, readonly string[]>)[code] ?? [];
      const params = Object.fromEntries(names.map((name) => [name, 2]));

      const text = createErrorText(onError)({ error: code, params });

      expect(onError).not.toHaveBeenCalled();
      expect(text).not.toMatch(/[{}]/);
      expect(text.length).toBeGreaterThan(0);
    },
  );

  it("says minute and minutes for the rate limit", () => {
    const errorText = createErrorText();

    expect(
      errorText({ error: "tooManyAttempts", params: { minutes: 1 } }),
    ).toBe("Too many attempts. Please try again in 1 minute.");
    expect(
      errorText({ error: "tooManyAttempts", params: { minutes: 15 } }),
    ).toBe("Too many attempts. Please try again in 15 minutes.");
  });

  it("takes a bare code for a message without params", () => {
    expect(createErrorText()("itemNotFound")).toBe("Item not found");
  });

  // An open tab of the last deploy can meet a code this build has not.
  it("shows the generic text for a code it does not know, and reports it", () => {
    const onError = vi.fn();
    const unknown = { error: "removedCode" } as unknown as { error: ErrorCode };

    expect(createErrorText(onError)(unknown)).toBe(GENERIC);
    expect(onError).toHaveBeenCalledOnce();
  });

  it("shows the generic text when a param is missing, never the raw message", () => {
    const onError = vi.fn();

    expect(createErrorText(onError)({ error: "tooManyAttempts" })).toBe(
      GENERIC,
    );
    expect(onError).toHaveBeenCalledOnce();
  });
});
