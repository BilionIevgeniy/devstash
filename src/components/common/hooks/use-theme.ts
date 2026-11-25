import { useSyncExternalStore } from "react";

import { createStorageStore } from "@/components/common/hooks/storage-store";
import {
  parseTheme,
  resolveTheme,
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";

// One store for the tab, shared by every picker, the user menu, ThemeSync and
// the toasts, in whichever layout they are (ADR 0039). Storage, other tabs and
// the back-forward cache are the storage store's; this adds the system's
// setting, followed while anyone listens. The snapshot of a choice other than
// "system" does not change with it, so nothing renders then.
let systemQuery: MediaQueryList | undefined;

function followSystem(notify: () => void): () => void {
  // jsdom has no matchMedia.
  if (typeof window.matchMedia !== "function") return () => undefined;
  const query = window.matchMedia(SYSTEM_DARK_QUERY);
  systemQuery = query;
  query.addEventListener("change", notify);
  return () => {
    query.removeEventListener("change", notify);
    systemQuery = undefined;
  };
}

const store = createStorageStore<Theme>({
  key: THEME_STORAGE_KEY,
  parse: parseTheme,
  serialize: (theme) => theme,
  listenAlso: followSystem,
});

// The query of the subscription when there is one, so a snapshot does not
// make a new one each time. Without matchMedia "system" stays dark, as the
// inline script does when the call throws.
function systemIsDark(): boolean {
  if (systemQuery) return systemQuery.matches;
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia(SYSTEM_DARK_QUERY).matches;
}

function readResolvedTheme(): ResolvedTheme {
  const theme = store.read();
  return theme === "system" ? resolveTheme(theme, systemIsDark()) : theme;
}

// The server and the first render of the browser know nothing: what depends on
// the choice renders a placeholder, never a guess, until hydration is over.
function readServerTheme(): undefined {
  return undefined;
}

export function setTheme(theme: Theme): void {
  store.write(theme);
}

/** Forgets the tab's state. For tests only. */
export function forgetTheme(): void {
  store.forget();
}

/** The choice; undefined until it has been read after hydration. */
export function useTheme(): Theme | undefined {
  return useSyncExternalStore(store.subscribe, store.read, readServerTheme);
}

/** Light or dark as the page is painted; undefined until hydration is over. */
export function useResolvedTheme(): ResolvedTheme | undefined {
  return useSyncExternalStore(
    store.subscribe,
    readResolvedTheme,
    readServerTheme,
  );
}
