import { z } from "zod";

import { LOCALES } from "@/i18n/config";

// The language the user picks in the user menu.
export const localeSchema = z.enum(LOCALES, "invalidInput");
