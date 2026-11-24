import { describe, expect, it } from "vitest";

import {
  SEARCH_OFFSET_MAX,
  SEARCH_TEXT_MAX,
} from "@/features/search/domain/limits";
import { parseSearchParams } from "@/features/search/schemas";

const parse = (query: string) => parseSearchParams(new URLSearchParams(query));

describe("parseSearchParams", () => {
  it("falls back to the recent list and the first page", () => {
    expect(parse("").data).toEqual({ q: "", cursor: 0 });
    expect(parse("q=%20%20").data).toEqual({ q: "", cursor: 0 });
  });

  it("trims the text and takes the cursor as a number", () => {
    expect(parse("q=%20react%20&cursor=20").data).toEqual({
      q: "react",
      cursor: 20,
    });
  });

  it("takes the text and the cursor up to their limits", () => {
    const atLimit = `q=${"x".repeat(SEARCH_TEXT_MAX)}&cursor=${SEARCH_OFFSET_MAX}`;

    expect(parse(atLimit).success).toBe(true);
  });

  // The cursor is an OFFSET of a query: an unbounded one reads the whole index.
  it.each([
    `q=${"x".repeat(SEARCH_TEXT_MAX + 1)}`,
    `cursor=${SEARCH_OFFSET_MAX + 1}`,
    "cursor=-1",
    "cursor=1.5",
    "cursor=abc",
    "cursor=Infinity",
  ])("refuses %s", (query) => {
    expect(parse(query).success).toBe(false);
  });
});
