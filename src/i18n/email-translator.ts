import { createTranslator } from "next-intl";

import type { Locale } from "@/i18n/config";
import { messagesFor } from "@/i18n/messages";

function rethrow(error: Error): never {
  throw error;
}

// The words of the emails, and of the other text a service sends out (the
// note on Stripe's Checkout page), in the locale the request asked in, without
// a request API: a service passes the locale in (ADR 0024). Shared by `auth`
// and `billing`, so it lives here. A message that cannot be formatted throws,
// so a broken email is never sent; messages.test.ts formats every one of them.
export function emailTranslator(locale: Locale) {
  return createTranslator({
    locale,
    messages: { emails: messagesFor(locale).emails },
    namespace: "emails",
    onError: rethrow,
  });
}
