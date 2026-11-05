import { describe, expect, it } from "vitest";

import { safeCallbackPath } from "./callback-url";

const DEFAULT = "/dashboard";

describe("safeCallbackPath", () => {
  it.each([
    "/dashboard",
    "/",
    "/items/snippets",
    "/items/snippets/abc123?tab=edit&page=2#notes",
    "/collections/%E6%97%A5%E6%9C%AC",
  ])("keeps the internal path %s", (path) => {
    expect(safeCallbackPath(path)).toBe(path);
  });

  it.each([
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "dashboard",
    "",
  ])("rejects %s, which does not stay on this site", (value) => {
    expect(safeCallbackPath(value)).toBe(DEFAULT);
  });

  it.each(["/a\tb", "/a b", "/a\nb", "/\t/evil.com"])(
    "rejects whitespace and control characters in %j",
    (value) => {
      expect(safeCallbackPath(value)).toBe(DEFAULT);
    },
  );

  it("rejects non-ASCII, which would make the redirect header throw", () => {
    expect(safeCallbackPath("/日本語")).toBe(DEFAULT);
  });

  it.each([[null], [undefined], [42], [["/items", "/pinned"]]])(
    "falls back for the non-string value %j",
    (value) => {
      expect(safeCallbackPath(value)).toBe(DEFAULT);
    },
  );
});
