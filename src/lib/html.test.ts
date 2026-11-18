import { describe, expect, it } from "vitest";

import { escapeHtml } from "@/lib/html";

describe("escapeHtml", () => {
  it("escapes what could open a tag or an attribute", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&lt;/a&gt;",
    );
  });
});
