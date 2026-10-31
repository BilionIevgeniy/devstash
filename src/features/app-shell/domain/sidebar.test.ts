import { describe, expect, it } from "vitest";
import {
  parseSidebarOpen,
  SIDEBAR_COOKIE,
  sidebarCookie,
} from "@/features/app-shell/domain/sidebar";

describe("parseSidebarOpen", () => {
  it("is closed only for an exact false", () => {
    expect(parseSidebarOpen("false")).toBe(false);
  });

  it("stays open without a cookie or with an odd value", () => {
    expect(parseSidebarOpen(undefined)).toBe(true);
    expect(parseSidebarOpen("true")).toBe(true);
    expect(parseSidebarOpen("FALSE")).toBe(true);
    expect(parseSidebarOpen("")).toBe(true);
  });
});

describe("sidebarCookie", () => {
  it("writes a value the parser reads back", () => {
    for (const isOpen of [true, false]) {
      const [pair] = sidebarCookie(isOpen).split(";");
      const [name, value] = pair.split("=");
      expect(name).toBe(SIDEBAR_COOKIE);
      expect(parseSidebarOpen(value)).toBe(isOpen);
    }
  });

  it("covers the whole site", () => {
    expect(sidebarCookie(true)).toContain("path=/");
  });
});
