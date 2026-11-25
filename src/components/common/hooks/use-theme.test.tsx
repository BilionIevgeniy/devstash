import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  forgetTheme,
  setTheme,
  useResolvedTheme,
  useTheme,
} from "@/components/common/hooks/use-theme";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { act, renderHook } from "../../../../test/intl";

function useBoth() {
  return { theme: useTheme(), resolved: useResolvedTheme() };
}

// A matchMedia the test can switch, since jsdom has none.
function stubSystem(initiallyDark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: initiallyDark,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => query);
  return (dark: boolean) => {
    query.matches = dark;
    for (const listener of listeners) listener();
  };
}

beforeEach(() => {
  window.localStorage.clear();
  forgetTheme();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
    const switchSystem = stubSystem(true);
    const { result } = renderHook(useBoth);
    act(() => setTheme("system"));
    expect(result.current.resolved).toBe("dark");

    act(() => switchSystem(false));
    expect(result.current).toEqual({ theme: "system", resolved: "light" });

    act(() => setTheme("dark"));
    act(() => switchSystem(true));
    act(() => switchSystem(false));
    expect(result.current.resolved).toBe("dark");
  });

  it("takes a choice made in another tab", () => {
    const { result } = renderHook(useBoth);
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: THEME_STORAGE_KEY,
          newValue: "light",
        }),
      );
    });
    expect(result.current.theme).toBe("light");

    // The other tab cleared its storage.
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current.theme).toBe("dark");
  });

  it("reads storage again when the page comes back from the cache", () => {
    const { result } = renderHook(useBoth);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: false }),
      );
    });
    expect(result.current.theme).toBe("dark");

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    expect(result.current.theme).toBe("light");
  });

  // Playwright's Chromium never restores a page from the back-forward cache
  // (ADR 0037), so this case is proved here only.
  it("keeps a choice storage refused, also after the cache", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    const { result } = renderHook(useBoth);

    act(() => setTheme("light"));
    expect(result.current.theme).toBe("light");

    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    expect(result.current.theme).toBe("light");
  });
});
