import { describe, expect, it } from "vitest";

import {
  freeSlug,
  isReservedTypeName,
  sameTypeName,
  slugFromName,
} from "@/features/item-types/domain/custom-type";

describe("slugFromName", () => {
  it("lower-cases a name and joins its words with dashes", () => {
    expect(slugFromName("My Recipes")).toBe("my-recipes");
  });

  it("drops accents and umlauts to their letter", () => {
    expect(slugFromName("Café Notizen für Ärzte")).toBe(
      "cafe-notizen-fur-arzte",
    );
  });

  it("turns every run of other characters into one dash, none at the ends", () => {
    expect(slugFromName("  --C++ / Rust!!  ")).toBe("c-rust");
  });

  it("falls back to `type` for a name without Latin letters or digits", () => {
    expect(slugFromName("Заметки")).toBe("type");
    expect(slugFromName("!!!")).toBe("type");
  });

  it("stays within 40 characters and does not end on a dash", () => {
    const slug = slugFromName(`${"a".repeat(39)} b`);
    expect(slug).toBe("a".repeat(39));
    expect(slugFromName("x".repeat(60))).toHaveLength(40);
  });
});

describe("freeSlug", () => {
  it("keeps a base nobody has", () => {
    expect(freeSlug("recipes", [])).toBe("recipes");
  });

  it("counts up from -2 past the user's own slugs", () => {
    expect(freeSlug("recipes", ["recipes", "recipes-2"])).toBe("recipes-3");
  });

  it("never gives a system type's slug or name", () => {
    expect(freeSlug("snippets", [])).toBe("snippets-2");
    expect(freeSlug("note", [])).toBe("note-2");
  });

  it("shortens a long base so the suffix still fits in 40 characters", () => {
    const base = "a".repeat(40);
    const slug = freeSlug(base, [base]);
    expect(slug).toBe(`${"a".repeat(38)}-2`);
    expect(slug).toHaveLength(40);
  });
});

describe("isReservedTypeName", () => {
  it("refuses a system type's name in any case", () => {
    expect(isReservedTypeName("snippet")).toBe(true);
    expect(isReservedTypeName(" Snippet ")).toBe(true);
    expect(isReservedTypeName("LINK")).toBe(true);
  });

  it("allows look-alikes: the plural and other languages", () => {
    expect(isReservedTypeName("Snippets")).toBe(false);
    expect(isReservedTypeName("Befehle")).toBe(false);
  });
});

describe("sameTypeName", () => {
  it("ignores case and surrounding spaces", () => {
    expect(sameTypeName("Recipes", " recipes")).toBe(true);
    expect(sameTypeName("Recipes", "Recipe")).toBe(false);
  });
});

describe("sameTypeName", () => {
  it("ignores blanks and case on either side", () => {
    expect(sameTypeName(" RECIPE ", "recipe")).toBe(true);
    expect(sameTypeName("recipe", " RECIPE ")).toBe(true);
    expect(sameTypeName("recipe", "recipes")).toBe(false);
  });
});
