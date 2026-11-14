import { createTranslator } from "next-intl";

import type { Locale } from "@/i18n/config";
import { errorTextFrom, type ErrorText } from "@/i18n/error-text";
import { messageFallback } from "@/i18n/fallback";
import { messagesFor } from "@/i18n/messages";

function ignore(): void {}

// Turns codes into words outside React, for the tests of a plain helper that
// takes `errorText` from its caller. Built like the app's translators: the
// same messages and fallback, so a code this build does not know or a message
// that cannot be formatted shows the generic text; `onError` hears of it.
export function createErrorText(
  onError: (error: Error) => void = ignore,
  locale: Locale = "en",
): ErrorText {
  const messages = { errors: messagesFor(locale).errors };
  const translate = createTranslator({
    locale,
    messages,
    namespace: "errors",
    onError,
    getMessageFallback: messageFallback(messages),
  });
  return errorTextFrom(translate);
}
