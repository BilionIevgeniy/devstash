"use client";

import { THEME_SCRIPT } from "@/lib/theme";

// The stored theme on <html> before the first paint (ADR 0039): the browser
// runs the script while it parses <head>, so a static page needs no request
// and shows no flash. A client component so the `type` can differ: run on the
// server's HTML, inert when React renders it in the browser, where an inserted
// script would not run anyway and React would warn about it (the pattern of
// Next's guide "Preventing Flash"). ThemeSync keeps the class right afterwards.
export function ThemeScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
