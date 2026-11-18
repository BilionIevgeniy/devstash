import { describe, expect, it } from "vitest";

import { customTypeInputSchema } from "@/features/item-types/schemas";

const valid = { name: "Recipes", icon: "Code", color: "#3b82f6" };

function errorOf(input: unknown) {
  const parsed = customTypeInputSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues.map((i) => i.message);
}

describe("customTypeInputSchema", () => {
  it("accepts a name, an icon of the set and a colour of the palette", () => {
    expect(
      customTypeInputSchema.parse({ ...valid, name: "  Recipes " }),
    ).toEqual(valid);
  });

  it("refuses an empty, a too long and a system name", () => {
    expect(errorOf({ ...valid, name: "   " })).toEqual(["typeNameRequired"]);
    expect(errorOf({ ...valid, name: "x".repeat(41) })).toEqual([
      "typeNameTooLong",
    ]);
    expect(errorOf({ ...valid, name: "Snippet" })).toEqual([
      "typeNameReserved",
    ]);
  });

  it("refuses a free hex value and an icon outside the set", () => {
    expect(errorOf({ ...valid, color: "#123456" })).toEqual([
      "invalidTypeColor",
    ]);
    expect(errorOf({ ...valid, icon: "Skull" })).toEqual(["invalidTypeIcon"]);
  });

  it("never takes a slug from the input", () => {
    expect(
      customTypeInputSchema.parse({ ...valid, slug: "x" }),
    ).not.toHaveProperty("slug");
  });
});
