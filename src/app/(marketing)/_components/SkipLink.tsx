import { getTranslations } from "next-intl/server";

import type { Locale } from "@/i18n/config";

/** The `id` of the `<main>` of every marketing and legal page. */
export const MAIN_CONTENT_ID = "main-content";

// The first stop of the tab order, before the fixed header (WCAG 2.4.1): hidden
// until it has the focus, then over the header's corner. The `<main>` it points
// at has `tabIndex={-1}`, so Safari moves the focus there too.
export async function SkipLink({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "marketing" });
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only rounded-md bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:ring-2 focus:ring-ring focus:outline-none"
    >
      {t("skipToContent")}
    </a>
  );
}
