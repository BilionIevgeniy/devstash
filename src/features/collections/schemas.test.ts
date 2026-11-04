import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  NAME_MAX,
} from "@/features/collections/domain/collection-fields";
import { createCollectionSchema } from "@/features/collections/schemas";

describe("createCollectionSchema", () => {
  it("trims the name and the description", () => {
    expect(
      createCollectionSchema.parse({
        name: "  React Patterns ",
        description: " Hooks ",
      }),
    ).toEqual({ name: "React Patterns", description: "Hooks" });
  });

  it("rejects a name of only spaces", () => {
    expect(createCollectionSchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("accepts a name at the limit and rejects one over it", () => {
    const atLimit = "a".repeat(NAME_MAX);

    expect(createCollectionSchema.safeParse({ name: atLimit }).success).toBe(
      true,
    );
    expect(
      createCollectionSchema.safeParse({ name: `${atLimit}a` }).success,
    ).toBe(false);
  });

  it("accepts a description at the limit and rejects one over it", () => {
    const atLimit = "a".repeat(DESCRIPTION_MAX);

    expect(
      createCollectionSchema.safeParse({ name: "Notes", description: atLimit })
        .success,
    ).toBe(true);
    expect(
      createCollectionSchema.safeParse({
        name: "Notes",
        description: `${atLimit}a`,
      }).success,
    ).toBe(false);
  });

  it("stores a blank description as null", () => {
    expect(
      createCollectionSchema.parse({ name: "Notes", description: "   " }),
    ).toEqual({ name: "Notes", description: null });
  });

  it("strips a userId sent by the client", () => {
    expect(
      createCollectionSchema.parse({ name: "Notes", userId: "someone-else" }),
    ).toEqual({ name: "Notes" });
  });
});
