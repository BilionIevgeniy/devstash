import { useLayoutEffect } from "react";

// The language of the document follows the provider's locale. The text of a
// page is in a wrapper with `lang`, but dialogs, sheets, menus and toasts
// render into the body through portals, outside it: without this a screen
// reader read a German dialog as English. The root layout stays static with
// `lang="en"` (ADR 0024), so the static HTML of /de says "en" until
// hydration, which the wrapper's `lang` covers for the page's own text. A
// locale switch gives the provider a new locale and this runs again; on
// unmount the attribute goes back, unless something else set it since.
export function useDocumentLang(locale: string): void {
  useLayoutEffect(() => {
    const html = document.documentElement;
    const before = html.lang;
    html.lang = locale;
    return () => {
      if (html.lang === locale) html.lang = before;
    };
  }, [locale]);
}
