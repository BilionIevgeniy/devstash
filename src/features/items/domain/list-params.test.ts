import { describe, expect, it } from "vitest";

import {
  DEFAULT_ITEM_LIST_PARAMS,
  isFilteredList,
  itemListHref,
  type ItemListParams,
} from "@/features/items/domain/list-params";

const BASE = "/items/snippets";

function params(change: Partial<ItemListParams> = {}): ItemListParams {
  return { ...DEFAULT_ITEM_LIST_PARAMS, ...change };
}

describe("itemListHref", () => {
  it("leaves the defaults out, so the default view is the bare path", () => {
    expect(itemListHref(BASE, params())).toBe(BASE);
    expect(
      itemListHref(BASE, params({ sort: "a-z" }), { sort: "newest" }),
    ).toBe(BASE);
  });

  it("writes sort, tag and page in a fixed order, page last", () => {
    expect(
      itemListHref(BASE, params({ page: 3, tag: "react", sort: "z-a" })),
    ).toBe(`${BASE}?sort=z-a&tag=react&page=3`);
  });

  it("starts again at page 1 when the sort or the tag changes", () => {
    const onPage3 = params({ page: 3 });

    expect(itemListHref(BASE, onPage3, { sort: "a-z" })).toBe(
      `${BASE}?sort=a-z`,
    );
    expect(itemListHref(BASE, onPage3, { tag: "react" })).toBe(
      `${BASE}?tag=react`,
    );
    expect(
      itemListHref(BASE, params({ tag: "react", page: 3 }), { tag: null }),
    ).toBe(BASE);
  });

  it("keeps the sort and the tag when only the page changes", () => {
    expect(
      itemListHref(BASE, params({ sort: "oldest", tag: "api" }), { page: 2 }),
    ).toBe(`${BASE}?sort=oldest&tag=api&page=2`);
  });

  it.each([
    ["two words", "tag=two+words"],
    ["a&b", "tag=a%26b"],
    ["c#", "tag=c%23"],
    ["c++", "tag=c%2B%2B"],
  ])("encodes the tag %j so it stays one parameter", (tag, encoded) => {
    const href = itemListHref(BASE, params(), { tag });

    expect(href).toBe(`${BASE}?${encoded}`);
    expect(new URL(href, "http://x").searchParams.get("tag")).toBe(tag);
  });
});

describe("isFilteredList", () => {
  it("is true only with a tag: a sort does not narrow the rows", () => {
    expect(isFilteredList(params({ sort: "z-a", page: 2 }))).toBe(false);
    expect(isFilteredList(params({ tag: "react" }))).toBe(true);
  });
});
