import { describe, expect, it } from "vitest";
import { isActivePath } from "@/features/app-shell/domain/active-link";

describe("isActivePath", () => {
  it("matches the same path in both modes", () => {
    expect(isActivePath("/favorites", "/favorites", "exact")).toBe(true);
    expect(isActivePath("/items/snippets", "/items/snippets", "prefix")).toBe(
      true,
    );
  });

  it("exact ignores the pages below the link", () => {
    expect(isActivePath("/collections/abc", "/collections", "exact")).toBe(
      false,
    );
  });

  it("prefix covers the pages below the link", () => {
    expect(
      isActivePath("/items/snippets/item-1", "/items/snippets", "prefix"),
    ).toBe(true);
  });

  it("prefix stops at a segment boundary", () => {
    expect(
      isActivePath("/collections/abcd", "/collections/abc", "prefix"),
    ).toBe(false);
    expect(isActivePath("/items/snippetsx", "/items/snippets", "prefix")).toBe(
      false,
    );
  });
});
