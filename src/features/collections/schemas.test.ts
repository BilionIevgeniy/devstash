import { describe, expect, it } from "vitest";
import {
  DESCRIPTION_MAX,
  NAME_MAX,
} from "@/features/collections/domain/collection-fields";
import {
  collectionIdSchema,
  createCollectionSchema,
  deleteCollectionOptionsSchema,
} from "@/features/collections/schemas";

describe("deleteCollectionOptionsSchema", () => {
  // A card calls the action with no options at all.
  it("refreshes by default", () => {
    expect(deleteCollectionOptionsSchema.parse(undefined)).toEqual({
      refresh: true,
    });
    expect(deleteCollectionOptionsSchema.parse({})).toEqual({ refresh: true });
  });

  it("keeps a caller's refresh: false", () => {
    expect(deleteCollectionOptionsSchema.parse({ refresh: false })).toEqual({
      refresh: false,
    });
  });
});

describe("collectionIdSchema", () => {
  it("accepts a generated id", () => {
    expect(
      collectionIdSchema.safeParse("cmh1x2y3z0000abcd1234efgh").success,
    ).toBe(true);
  });

  // The id comes from the URL: a NUL byte would make Postgres throw, and the
  // page would show the error screen where a missing collection belongs.
  it("rejects a malformed id", () => {
    expect(collectionIdSchema.safeParse("bad\u0000id").success).toBe(false);
    expect(collectionIdSchema.safeParse("Not An Id").success).toBe(false);
  });
});

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
