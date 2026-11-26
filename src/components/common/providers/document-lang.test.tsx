import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useDocumentLang } from "./document-lang";

afterEach(() => {
  document.documentElement.lang = "en";
});

describe("useDocumentLang", () => {
  it("sets the document's language and gives it back on unmount", () => {
    document.documentElement.lang = "en";
    const { unmount, rerender } = renderHook(
      ({ locale }) => useDocumentLang(locale),
      { initialProps: { locale: "de" } },
    );
    expect(document.documentElement.lang).toBe("de");

    rerender({ locale: "en" });
    expect(document.documentElement.lang).toBe("en");
    rerender({ locale: "de" });
    unmount();
    expect(document.documentElement.lang).toBe("en");
  });

  it("leaves a language that something else set since", () => {
    const { unmount } = renderHook(() => useDocumentLang("de"));
    document.documentElement.lang = "fr";
    unmount();
    expect(document.documentElement.lang).toBe("fr");
  });
});
