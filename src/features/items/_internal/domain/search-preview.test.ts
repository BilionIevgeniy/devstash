import { describe, expect, it } from "vitest";

import { toSearchPreview } from "@/features/items/_internal/domain/search-preview";

describe("toSearchPreview", () => {
  it("has no preview for an item with nothing to show", () => {
    expect(toSearchPreview(null)).toBeNull();
    expect(toSearchPreview("")).toBeNull();
    expect(toSearchPreview(" \n\t ")).toBeNull();
  });

  it("puts multi-line content on one line", () => {
    expect(toSearchPreview("  const a = 1;\n\n  const b = 2;\n")).toBe(
      "const a = 1; const b = 2;",
    );
  });

  it("keeps a URL as it is", () => {
    expect(toSearchPreview("https://react.dev/learn")).toBe(
      "https://react.dev/learn",
    );
  });

  it("cuts long text at the limit", () => {
    expect(toSearchPreview("a".repeat(500))).toBe("a".repeat(120));
  });

  it("leaves no space at the end of a cut", () => {
    expect(toSearchPreview(`${"a".repeat(119)} bcd`)).toBe("a".repeat(119));
  });

  it("never splits an emoji at the cut", () => {
    const preview = toSearchPreview("😀".repeat(200));

    expect(preview).toBe("😀".repeat(120));
  });
});
