import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/app-url";

// Only the API is closed to crawlers. The app and auth pages stay open on
// purpose: a page a crawler may not fetch is never seen saying noindex, and
// its URL can still be indexed from links. They say noindex instead, as a
// header (next.config.ts) and in their metadata.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
  };
}
