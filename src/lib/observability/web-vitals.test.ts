import { describe, expect, it } from "vitest";

import { pageGroup, parseWebVital } from "@/lib/observability/web-vitals";

describe("pageGroup", () => {
  it.each([
    ["/", "/"],
    ["/de", "/de"],
    ["/dashboard/", "/dashboard"],
    ["/settings/locked-files", "/settings/locked-files"],
    ["/items/snippets", "/items/[type]"],
    ["/items/snippets/clx123", "/items/[type]/[id]"],
    ["/collections/clx123", "/collections/[id]"],
  ])("puts %s in %s", (path, group) => {
    expect(pageGroup(path)).toBe(group);
  });

  it("puts every other path in one group, so no URL is ever passed on", () => {
    expect(pageGroup("/reset-password/abc")).toBe("other");
    expect(pageGroup("/items/a/b/c")).toBe("other");
    expect(pageGroup("/whatever?token=x")).toBe("other");
  });
});

describe("parseWebVital", () => {
  it("takes a metric of the three with a value in range and a known group", () => {
    expect(
      parseWebVital({ name: "LCP", value: 1234.5, group: "/items/[type]" }),
    ).toEqual({ name: "LCP", value: 1234.5, group: "/items/[type]" });
    expect(parseWebVital({ name: "CLS", value: 0, group: "/" })).not.toBeNull();
  });

  it.each([
    ["no object", "LCP"],
    ["another metric", { name: "TTFB", value: 10, group: "/" }],
    ["a URL as the group", { name: "LCP", value: 10, group: "/items/a/b" }],
    ["a string value", { name: "LCP", value: "10", group: "/" }],
    ["a negative value", { name: "INP", value: -1, group: "/" }],
    ["a value out of range", { name: "CLS", value: 1000, group: "/" }],
    ["not finite", { name: "LCP", value: Infinity, group: "/" }],
    ["null", null],
  ])("refuses %s", (_, body) => {
    expect(parseWebVital(body)).toBeNull();
  });
});

describe("the edges of a Web Vital", () => {
  it.each([
    "/x/items/snippets",
    "/x/items/a/b",
    "/x/collections/a",
    "/collections/a/b",
  ])("puts %s in no group of a page", (path) => {
    expect(pageGroup(path)).toBe("other");
  });

  it("takes 0 and the largest value, and nothing beyond", () => {
    const lcp = (value: unknown) =>
      parseWebVital({ name: "LCP", value, group: "/" });
    expect(lcp(0)).not.toBeNull();
    expect(lcp(120_000)).not.toBeNull();
    expect(lcp(120_001)).toBeNull();
    expect(lcp(-1)).toBeNull();
    expect(lcp("5")).toBeNull();
    expect(lcp(Number.NaN)).toBeNull();
  });
});
