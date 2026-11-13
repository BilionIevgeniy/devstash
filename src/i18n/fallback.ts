import type { Locale } from "@/i18n/config";
import deErrors from "@/i18n/messages/de/errors.json";
import enErrors from "@/i18n/messages/en/errors.json";

const GENERIC = { en: enErrors.generic, de: deErrors.generic };

interface FallbackInfo {
  key: string;
  namespace?: string;
}

// What a message that cannot be shown turns into, on the server and in the
// browser alike. An error code this build does not know (an open tab during a
// deploy) or one whose params are missing shows the generic error, never the
// raw key; a missing interface key (which tsc should have caught) shows its
// path, so it is noticed instead of reading like a failure.
export function messageFallback(locale: Locale) {
  return ({ key, namespace }: FallbackInfo): string =>
    namespace === "errors"
      ? GENERIC[locale]
      : [namespace, key].filter(Boolean).join(".");
}
