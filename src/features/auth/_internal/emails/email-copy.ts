import { createTranslator } from "next-intl";

import type { Locale } from "@/i18n/config";
import deEmails from "@/i18n/messages/de/emails.json";
import enEmails from "@/i18n/messages/en/emails.json";

const EMAILS = { en: enEmails, de: deEmails };

function rethrow(error: Error): never {
  throw error;
}

// The words of the emails in the locale the request asked in, without a
// request API: a service sends them and passes the locale in (ADR 0024). A
// message that cannot be formatted throws, so a broken email is never sent;
// messages.test.ts formats every one of them.
export function emailTranslator(locale: Locale) {
  return createTranslator({
    locale,
    messages: { emails: EMAILS[locale] },
    namespace: "emails",
    onError: rethrow,
  });
}
