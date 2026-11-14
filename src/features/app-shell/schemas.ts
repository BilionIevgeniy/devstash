import { z } from "zod";

import { LOCALES } from "@/i18n/config";

// The language the user picks, in the user menu or on the homepage.
export const localeSchema = z.enum(LOCALES, "invalidInput");

// The body of POST /api/locale, the homepage's language link.
export const localeBodySchema = z.object({ locale: localeSchema });
