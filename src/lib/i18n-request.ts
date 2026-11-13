import "server-only";

import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  DEFAULT_TIME_ZONE,
  FORMATS,
  isLocale,
  LOCALE_COOKIE,
  resolveLocale,
} from "@/i18n/config";
import { messageFallback } from "@/i18n/fallback";
import { messagesFor } from "@/i18n/messages";
import { logger } from "@/lib/logger";

// The locale of a server render (ADR 0024). A caller that passes a locale
// (`getTranslations({ locale })`, as the static marketing pages do) gets it
// and no request API is read, so those pages stay static. Every other render
// (the app, the auth pages) reads the cookie the user chose, then the
// browser's Accept-Language, then falls back to English. The plugin in
// next.config.ts points here; it lives in lib for the logger (src/i18n
// imports no other layer).
export default getRequestConfig(async (params) => {
  const locale = isLocale(params.locale)
    ? params.locale
    : resolveLocale(
        (await cookies()).get(LOCALE_COOKIE)?.value,
        (await headers()).get("accept-language"),
      );

  return {
    locale,
    messages: messagesFor(locale),
    timeZone: DEFAULT_TIME_ZONE,
    formats: FORMATS,
    getMessageFallback: messageFallback(locale),
    onError: (error) => {
      logger.warn("A message could not be shown", { error });
    },
  };
});
