import { describe, expect, it } from "vitest";

import { collectionAccent } from "@/features/collections/domain/collection-accent";

describe("collectionAccent", () => {
  it("takes the colour of the first type", () => {
    expect(collectionAccent([{ color: "#111" }, { color: "#222" }])).toBe(
      "#111",
    );
  });

  it("has none for an empty collection", () => {
    expect(collectionAccent([])).toBeUndefined();
  });
});
