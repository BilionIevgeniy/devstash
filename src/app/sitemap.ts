import type { MetadataRoute } from "next";

import { homePath, LOCALES } from "@/i18n/config";
import { getSiteOrigin } from "@/lib/app-url";

// The legal pages: German and English on one URL each.
const LEGAL_PATHS = ["/impressum", "/datenschutz"];

// The public pages only; everything behind sign-in is noindex. Built once at
// build time from the site's origin (getSiteOrigin), so it stays static.
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const languages = Object.fromEntries(
    LOCALES.map((locale) => [locale, `${origin}${homePath(locale)}`]),
  );

  return [
    ...LOCALES.map((locale) => ({
      url: `${origin}${homePath(locale)}`,
      alternates: { languages },
    })),
    ...LEGAL_PATHS.map((path) => ({ url: `${origin}${path}` })),
  ];
}
