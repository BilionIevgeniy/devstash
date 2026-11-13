import { createTranslator } from "next-intl";

import type { Locale } from "@/i18n/config";
import type {
  ErrorCode,
  ErrorParams,
  ErrorRef,
  PlainErrorCode,
} from "@/i18n/error-codes";
import { messageFallback } from "@/i18n/fallback";
import deErrors from "@/i18n/messages/de/errors.json";
import enErrors from "@/i18n/messages/en/errors.json";

/** The text of a failure, or of a code whose message needs no params. */
export type ErrorText = (ref: ErrorRef | PlainErrorCode) => string;

/** A translator of the `errors` namespace, as next-intl hands one out. */
export type ErrorTranslator = (code: ErrorCode, params?: ErrorParams) => string;

const ERRORS = { en: enErrors, de: deErrors };

function ignore(): void {}

/** The ErrorText of a translator: `useTranslations("errors")` or `getTranslations("errors")`. */
export function errorTextFrom(translate: ErrorTranslator): ErrorText {
  return (ref) => {
    const { error, params } = typeof ref === "string" ? { error: ref } : ref;
    return translate(error, params);
  };
}

// Turns codes into words outside React (tests, a plain module). A code this
// build does not know or a message that cannot be formatted shows the generic
// text, never the raw key; `onError` hears of it. next-intl's own default
// would write to console.error, which the lint keeps out of src.
export function createErrorText(
  onError: (error: Error) => void = ignore,
  locale: Locale = "en",
): ErrorText {
  const translate = createTranslator({
    locale,
    messages: { errors: ERRORS[locale] },
    namespace: "errors",
    onError,
    getMessageFallback: messageFallback(locale),
  });
  return errorTextFrom(translate);
}
