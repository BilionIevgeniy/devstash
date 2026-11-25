import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME,
  parseTheme,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

describe("theme value", () => {
  it("reads back each choice", () => {
    expect(parseTheme("system")).toBe("system");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("falls back to dark for no value and anything else", () => {
    expect(DEFAULT_THEME).toBe("dark");
    expect(parseTheme(null)).toBe("dark");
    expect(parseTheme("Light")).toBe("dark");
    expect(parseTheme("solarized")).toBe("dark");
  });

  it("answers system with the operating system's setting", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

interface ScriptWorld {
  stored: string | null;
  systemIsDark: boolean;
  storageThrows?: boolean;
  noMatchMedia?: boolean;
}

// Runs the inline script with stand-ins for the three globals it reads and
// answers whether it left <html> dark.
function runScript(world: ScriptWorld): boolean {
  const classes = new Set<string>();
  const document = {
    documentElement: {
      classList: {
        toggle: (name: string, on: boolean) => {
          if (on) classes.add(name);
          else classes.delete(name);
        },
      },
    },
  };
  const localStorage = {
    getItem: (key: string) => {
      if (world.storageThrows) throw new Error("SecurityError");
      return key === THEME_STORAGE_KEY ? world.stored : null;
    },
  };
  const matchMedia = world.noMatchMedia
    ? undefined
    : (query: string) => ({
        matches: query === SYSTEM_DARK_QUERY && world.systemIsDark,
      });
  // The script is a constant of the module, never user input.
  new Function("document", "localStorage", "matchMedia", THEME_SCRIPT)(
    document,
    localStorage,
    matchMedia,
  );
  return classes.has("dark");
}

describe("the inline theme script", () => {
  const worlds: ScriptWorld[] = [
    { stored: null, systemIsDark: false },
    { stored: "dark", systemIsDark: false },
    { stored: "light", systemIsDark: true },
    { stored: "system", systemIsDark: true },
    { stored: "system", systemIsDark: false },
    { stored: "solarized", systemIsDark: false },
  ];

  it.each(worlds)("paints as the store would for %o", (world) => {
    const expected =
      resolveTheme(parseTheme(world.stored), world.systemIsDark) === "dark";
    expect(runScript(world)).toBe(expected);
  });

  it("stays dark when storage is blocked or matchMedia is missing", () => {
    expect(
      runScript({ stored: "light", systemIsDark: false, storageThrows: true }),
    ).toBe(true);
    expect(
      runScript({ stored: "system", systemIsDark: false, noMatchMedia: true }),
    ).toBe(true);
  });
});
