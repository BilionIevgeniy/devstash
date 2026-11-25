import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  forgetTheme,
  setTheme,
  useResolvedTheme,
  useTheme,
} from "@/components/common/hooks/use-theme";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { act, renderHook } from "../../../../test/intl";

// Storage, other tabs and the back-forward cache are proved in
// storage-store.test.tsx; this file proves the theme's own rules.
function useBoth() {
  return { theme: useTheme(), resolved: useResolvedTheme() };
}

// A matchMedia the test can switch, since jsdom has none. Counts the queries
// made, so a test can see that a snapshot does not make one each time.
function stubSystem(initiallyDark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initiallyDark,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
  };
  const matchMedia = vi.fn(() => query);
  vi.stubGlobal("matchMedia", matchMedia);
  return {
    matchMedia,
    switchTo(dark: boolean) {
      query.matches = dark;
      for (const listener of listeners) listener();
    },
  };
}

beforeEach(() => {
  window.localStorage.clear();
  forgetTheme();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTheme", () => {
  it("is dark before any choice", () => {
    const { result } = renderHook(useBoth);
    expect(result.current).toEqual({ theme: "dark", resolved: "dark" });
  });

  it("reads the stored choice and stores a new one", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    const { result } = renderHook(useBoth);
    expect(result.current.resolved).toBe("light");

    act(() => setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("follows the system while the choice is system", () => {
    const system = stubSystem(true);
    const { result } = renderHook(useBoth);
    act(() => setTheme("system"));
    expect(result.current.resolved).toBe("dark");

    act(() => system.switchTo(false));
    expect(result.current).toEqual({ theme: "system", resolved: "light" });

    act(() => setTheme("dark"));
    act(() => system.switchTo(true));
    act(() => system.switchTo(false));
    expect(result.current.resolved).toBe("dark");
  });

  // The first render asks before the subscription exists; after that, every
  // snapshot reads the subscription's query.
  it("makes no new query for a snapshot while subscribed", () => {
    const system = stubSystem(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "system");
    const { result } = renderHook(useBoth);
    system.matchMedia.mockClear();

    act(() => system.switchTo(true));
    act(() => system.switchTo(false));
    expect(result.current.resolved).toBe("light");
    expect(system.matchMedia).not.toHaveBeenCalled();
  });
});
