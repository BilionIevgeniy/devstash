import { describe, expect, it } from "vitest";

import { useErrorText } from "@/components/common/hooks/use-error-text";

import { renderHook } from "../../../../test/intl";

// The words follow the locale of the nearest provider (the layouts set it).
describe("useErrorText", () => {
  it("speaks the language of the provider", () => {
    const english = renderHook(() => useErrorText());
    const german = renderHook(() => useErrorText(), { locale: "de" });

    expect(english.result.current("itemNotFound")).toBe("Item not found");
    expect(german.result.current("itemNotFound")).toBe(
      "Eintrag nicht gefunden",
    );
  });

  it("shows the generic text for a code without its params", () => {
    const { result } = renderHook(() => useErrorText(), { locale: "de" });

    expect(result.current({ error: "tooManyAttempts" })).toBe(
      "Etwas ist schiefgelaufen. Bitte versuch es noch einmal.",
    );
  });
});
