import { describe, expect, it } from "vitest";

import { fillLegalText, type LegalValues } from "@/lib/legal/fill";
import { CONTRACT_TEXTS } from "@/lib/legal/terms";
import type { LegalLang } from "@/lib/legal/types";

const VALUES: LegalValues = {
  freeItemLimit: "50",
  freeCollectionLimit: "3",
  monthlyPrice: "8,00 €",
  yearlyPrice: "72,00 €",
};

function allText(lang: LegalLang): string {
  return JSON.stringify(
    CONTRACT_TEXTS[lang].map((text) => fillLegalText(text, lang, VALUES)),
  );
}

describe("fillLegalText", () => {
  it.each(["de", "en"] as const)(
    "fills every value the %s contract texts name",
    (lang) => {
      const text = allText(lang);
      expect(text).not.toMatch(/\{\w+\}/);
      expect(text).toContain("50");
      expect(text).toContain("72,00 €");
    },
  );

  it("refuses a text that names an unknown value", () => {
    expect(() =>
      fillLegalText(
        { title: "T", sections: [{ id: "a", heading: "{typo}", blocks: [] }] },
        "en",
        VALUES,
      ),
    ).toThrow("{typo}");
  });

  it("fills list items too", () => {
    const filled = fillLegalText(
      {
        title: "T",
        sections: [
          { id: "a", heading: "H", blocks: [{ items: ["{freeItemLimit}"] }] },
        ],
      },
      "en",
      VALUES,
    );
    expect(filled.sections[0].blocks[0]).toEqual({ items: ["50"] });
  });
});
