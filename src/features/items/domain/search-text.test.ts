import { describe, expect, it } from "vitest";

import {
  SEARCH_TERMS_MAX,
  toPrefixTsQuery,
  toSearchMatch,
  toSearchTags,
  toTypoMatchText,
} from "@/features/items/domain/search-text";

describe("toPrefixTsQuery", () => {
  it("makes every term a required prefix", () => {
    expect(toPrefixTsQuery("react hook")).toBe("react:* & hook:*");
  });

  it("splits code the way the stored vector is split", () => {
    expect(toPrefixTsQuery("console.log")).toBe("console:* & log:*");
    expect(toPrefixTsQuery("next.config.ts")).toBe("next:* & config:* & ts:*");
    expect(toPrefixTsQuery("https://react.dev")).toBe(
      "https:* & react:* & dev:*",
    );
  });

  it("drops every tsquery operator the user types", () => {
    expect(toPrefixTsQuery("a & !b | (c) <-> 'd' :* foo")).toBe("foo:*");
  });

  it("keeps letters of any script and digits", () => {
    expect(toPrefixTsQuery("Привіт світ 42")).toBe("Привіт:* & світ:* & 42:*");
  });

  it("drops one-character terms", () => {
    expect(toPrefixTsQuery("a b react")).toBe("react:*");
  });

  it("keeps at most the first terms", () => {
    const text = Array.from({ length: 12 }, (_, i) => `t${i}`).join(" ");
    expect(toPrefixTsQuery(text)?.split(" & ")).toHaveLength(SEARCH_TERMS_MAX);
  });

  it("returns null when nothing is left to match", () => {
    expect(toPrefixTsQuery("!!!")).toBeNull();
    expect(toPrefixTsQuery("   ")).toBeNull();
    expect(toPrefixTsQuery("a")).toBeNull();
  });
});

describe("toTypoMatchText", () => {
  it("needs three characters", () => {
    expect(toTypoMatchText(" ab ")).toBeNull();
    expect(toTypoMatchText(" reakt ")).toBe("reakt");
  });

  it("counts only letters and digits", () => {
    expect(toTypoMatchText("!!!")).toBeNull();
    expect(toTypoMatchText("a😀b")).toBeNull();
    expect(toTypoMatchText("Привіт")).toBe("Привіт");
  });

  it("drops punctuation from the text", () => {
    expect(toTypoMatchText("next.config")).toBe("next config");
  });
});

describe("toSearchTags", () => {
  it("sorts, de-duplicates and joins with spaces", () => {
    expect(toSearchTags(["react", "api", "react"])).toBe("api react");
  });

  it("is empty for no tags", () => {
    expect(toSearchTags([])).toBe("");
  });
});

describe("toSearchMatch", () => {
  it("is null when the text can match nothing", () => {
    expect(toSearchMatch("r")).toBeNull();
    expect(toSearchMatch("!!!")).toBeNull();
  });

  it("keeps a typo match alone when no term is long enough", () => {
    expect(toSearchMatch("a b c")).toEqual({
      tsQuery: null,
      typoText: "a b c",
    });
  });

  it("holds both sides of a usual text", () => {
    expect(toSearchMatch("react")).toEqual({
      tsQuery: "react:*",
      typoText: "react",
    });
  });
});
