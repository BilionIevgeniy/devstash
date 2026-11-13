import { describe, expect, it } from "vitest";

import { homePath, isLocale, resolveLocale } from "@/i18n/config";

describe("resolveLocale", () => {
  it("takes the language the user chose over the browser's", () => {
    expect(resolveLocale("de", "en-US,en;q=0.9")).toBe("de");
    expect(resolveLocale("en", "de-DE")).toBe("en");
  });

  it("ignores a cookie that names no supported language", () => {
    expect(resolveLocale("fr", "de")).toBe("de");
    expect(resolveLocale("", null)).toBe("en");
  });

  it("takes the browser's first supported language, by quality", () => {
    expect(resolveLocale(undefined, "fr-FR,de;q=0.8,en;q=0.5")).toBe("de");
    expect(resolveLocale(undefined, "en;q=0.4,de;q=0.9")).toBe("de");
    expect(resolveLocale(undefined, "de-AT")).toBe("de");
  });

  it("keeps the header's order between equal qualities", () => {
    expect(resolveLocale(undefined, "en,de")).toBe("en");
  });

  it("skips a language the browser refuses (q=0) and the wildcard", () => {
    expect(resolveLocale(undefined, "de;q=0,*")).toBe("en");
  });

  it("falls back to English without a cookie or a usable header", () => {
    expect(resolveLocale(undefined, null)).toBe("en");
    expect(resolveLocale(undefined, "fr, ja;q=0.5")).toBe("en");
    expect(resolveLocale(undefined, ";;;,")).toBe("en");
  });
});

describe("isLocale", () => {
  it("knows the two locales only", () => {
    expect(isLocale("de")).toBe(true);
    expect(isLocale("DE")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});

describe("homePath", () => {
  it("keeps English at the root", () => {
    expect(homePath("en")).toBe("/");
    expect(homePath("de")).toBe("/de");
  });
});
