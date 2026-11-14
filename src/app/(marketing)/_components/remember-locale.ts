import "client-only";

import type { Locale } from "@/i18n/config";

// Tells the server which language the visitor picked on the homepage, so the
// auth pages and the app open in it (POST /api/locale). Never awaited and
// silent on failure: the visible switch is a plain navigation that has
// already happened, and the only cost of a lost request is that the next auth
// page follows the browser's language. No keepalive: the navigation is a
// client one, so the document is never unloaded.
export function rememberLocale(locale: Locale): void {
  void fetch("/api/locale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale }),
  }).catch(() => {});
}
