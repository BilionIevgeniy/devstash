import { describe, expect, it } from "vitest";

import { paletteView } from "@/features/search/domain/palette-view";
import type { PaletteResults } from "@/features/search/types";

const NONE: PaletteResults = { items: [], collections: [], nextCursor: null };
const FOUND: PaletteResults = {
  items: [],
  collections: [{ id: "c1", name: "React patterns", itemCount: 3 }],
  nextCursor: null,
};

describe("paletteView", () => {
  it("shows the skeleton until the first answer comes", () => {
    expect(
      paletteView({ outcome: null, previous: null, isPending: false }),
    ).toMatchObject({ isLoading: true, results: null });
    expect(
      paletteView({ outcome: null, previous: null, isPending: true }),
    ).toMatchObject({ isLoading: true, results: null });
  });

  it("keeps the previous results while the next answer is pending", () => {
    expect(
      paletteView({
        outcome: { status: "ready", results: NONE },
        previous: FOUND,
        isPending: true,
      }),
    ).toEqual({
      isLoading: false,
      failure: null,
      results: FOUND,
      isEmpty: false,
    });
  });

  it("names a failed answer and shows no rows", () => {
    expect(
      paletteView({
        outcome: { status: "rate-limited" },
        previous: FOUND,
        isPending: false,
      }),
    ).toEqual({
      isLoading: false,
      failure: "rate-limited",
      results: null,
      isEmpty: false,
    });
  });

  it("says an answer with no items and no collections is empty", () => {
    expect(
      paletteView({
        outcome: { status: "ready", results: NONE },
        previous: null,
        isPending: false,
      }),
    ).toMatchObject({ isEmpty: true });
    expect(
      paletteView({
        outcome: { status: "ready", results: FOUND },
        previous: null,
        isPending: false,
      }),
    ).toMatchObject({ isEmpty: false, results: FOUND });
  });
});
