import { describe, expect, it } from "vitest";
import { hasCollectionChanges } from "@/features/collections/domain/collection-fields";

const saved = { name: "React Patterns", description: "Hooks" };

describe("hasCollectionChanges", () => {
  it("finds no change in the saved values", () => {
    expect(hasCollectionChanges(saved, { ...saved })).toBe(false);
  });

  it("ignores spaces the schema would trim", () => {
    expect(
      hasCollectionChanges(saved, {
        name: " React Patterns ",
        description: "Hooks  ",
      }),
    ).toBe(false);
  });

  it("treats a blank description as the empty one", () => {
    expect(
      hasCollectionChanges(
        { name: "Notes", description: "" },
        { name: "Notes", description: "   " },
      ),
    ).toBe(false);
  });

  it("finds a changed name or description", () => {
    expect(hasCollectionChanges(saved, { ...saved, name: "React" })).toBe(true);
    expect(hasCollectionChanges(saved, { ...saved, description: "" })).toBe(
      true,
    );
  });
});

describe("blanks around a collection's fields", () => {
  it("are no change on either side", () => {
    const plain = { name: "React", description: "Hooks" };
    const padded = { name: " React ", description: " Hooks " };
    expect(hasCollectionChanges(plain, padded)).toBe(false);
    expect(hasCollectionChanges(padded, plain)).toBe(false);
  });
});
