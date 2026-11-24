"use client";

import { useTranslations } from "next-intl";
import type { MouseEvent } from "react";

import { MAIN_CONTENT_ID } from "@/components/common/main-content";

// Moves the focus without the hash of the link: a hash pushes a history entry
// the router does not know, and Back onto it would change the URL alone. A
// `<main>` that cannot take the focus takes it for this once: focusable for
// good, every click on its empty space would make it the active element, and
// what asks "has anything the focus?" would be wrong.
function focusMain(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById(MAIN_CONTENT_ID);
  if (!main) return;
  event.preventDefault();
  if (!main.hasAttribute("tabindex")) {
    main.setAttribute("tabindex", "-1");
    main.addEventListener("blur", () => main.removeAttribute("tabindex"), {
      once: true,
    });
  }
  main.focus();
}

// The first stop of the tab order, before the header and the navigation (WCAG
// 2.4.1): hidden until it has the focus, then over the page's corner. The
// `href` is what works before the script has loaded.
export function SkipLink() {
  const t = useTranslations("common");
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={focusMain}
      className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:ring-2 focus:ring-ring focus:outline-none"
    >
      {t("skipToContent")}
    </a>
  );
}
