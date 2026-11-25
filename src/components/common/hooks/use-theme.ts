import { useSyncExternalStore } from "react";

import {
  parseTheme,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";

// One store for the tab, shared by every picker, the user menu, ThemeSync and
// the toasts, in whichever layout they are (ADR 0039). The choice is kept in
// memory too: with storage blocked or full, a click still holds for this tab.
// Another tab's choice arrives through the `storage` event, the system's
// setting through matchMedia.
let theme: Theme | undefined;
// The last write threw: the memory holds a choice storage does not have.
let writeFailed = false;
const listeners = new Set<() => void>();
let systemQuery: MediaQueryList | undefined;

function readStoredTheme(): Theme {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return parseTheme(null);
  }
}

// jsdom has no matchMedia; without it "system" stays dark, as the inline
// script does when the call throws.
function systemIsDark(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function update(next: Theme): void {
  theme = next;
  notify();
}

function onStorage(event: StorageEvent): void {
  // A null key is a clear() of the whole storage.
  if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
  update(parseTheme(event.key === null ? null : event.newValue));
}

// A page restored from the back-forward cache missed the storage events of
// the time it was frozen. Not after a failed write: storage would answer
// with what the visitor already changed.
function onPageShow(event: PageTransitionEvent): void {
  if (!event.persisted || writeFailed) return;
  update(readStoredTheme());
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    // One listener for the life of the subscription: the snapshot of a
    // choice other than "system" does not change with it, so nothing renders.
    if (typeof window.matchMedia === "function") {
      systemQuery = window.matchMedia(SYSTEM_DARK_QUERY);
      systemQuery.addEventListener("change", notify);
    }
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", onPageShow);
    systemQuery?.removeEventListener("change", notify);
    systemQuery = undefined;
  };
}

/** The tab's choice, read from storage the first time it is asked for. */
export function readTheme(): Theme {
  theme ??= readStoredTheme();
  return theme;
}

function readResolvedTheme(): ResolvedTheme {
  const current = readTheme();
  return current === "system" ? resolveTheme(current, systemIsDark()) : current;
}

// The server and the first render of the browser know nothing: what depends on
// the choice renders a placeholder, never a guess, until hydration is over.
function readServerTheme(): undefined {
  return undefined;
}

export function setTheme(next: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    writeFailed = false;
  } catch {
    // Storage is blocked or full: the choice holds for this tab only.
    writeFailed = true;
  }
  update(next);
}

/** Forgets the tab's state. For tests only. */
export function forgetTheme(): void {
  theme = undefined;
  writeFailed = false;
}

/** The choice; undefined until it has been read after hydration. */
export function useTheme(): Theme | undefined {
  return useSyncExternalStore(subscribe, readTheme, readServerTheme);
}

/** Light or dark as the page is painted; undefined until hydration is over. */
export function useResolvedTheme(): ResolvedTheme | undefined {
  return useSyncExternalStore(subscribe, readResolvedTheme, readServerTheme);
}
