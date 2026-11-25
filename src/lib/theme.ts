// The colour theme the visitor chose (ADR 0039). It lives only in the
// browser's `localStorage`, written only when the visitor picks one: the root
// layout reads no request, so a cookie would reach no server code and the
// static pages stay static. An inline script in <head> (THEME_SCRIPT) applies
// it before the first paint; the store of `use-theme.ts` keeps it applied
// afterwards.

export const THEME_STORAGE_KEY = "devstash-theme";

/** "system" follows the operating system's light or dark setting. */
export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

/** What a page is painted in once "system" has been answered. */
export type ResolvedTheme = Exclude<Theme, "system">;

// Dark until the visitor chooses (the product is dark first): a visitor whose
// system is light opts in with "system" or "light".
export const DEFAULT_THEME: Theme = "dark";

/** The class on <html> that switches the tokens of globals.css to dark. */
export const DARK_CLASS = "dark";

export const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: string | null): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/** The stored value, or the default for no value and anything unknown. */
export function parseTheme(stored: string | null): Theme {
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function resolveTheme(
  theme: Theme,
  systemIsDark: boolean,
): ResolvedTheme {
  if (theme === "system") return systemIsDark ? "dark" : "light";
  return theme;
}

// The same rule as parseTheme and resolveTheme, written as the script the
// browser runs while it parses <head>, before React and before any paint.
// Blocked storage or no matchMedia leaves the default, as the store does.
// theme.test.ts runs it against the two functions above.
export const THEME_SCRIPT = `(function(){var d=true;try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light")d=false;else if(t==="system")d=matchMedia(${JSON.stringify(SYSTEM_DARK_QUERY)}).matches}catch(e){}document.documentElement.classList.toggle(${JSON.stringify(DARK_CLASS)},d)})()`;
