import { createTranslator } from "next-intl";

import { type ErrorRef, type PlainErrorCode } from "@/i18n/error-codes";
import errors from "@/i18n/messages/en/errors.json";

/** The text of a failure, or of a code whose message needs no params. */
export type ErrorText = (ref: ErrorRef | PlainErrorCode) => string;

function ignore(): void {}

// Turns codes into the words the user reads. A code this build does not know
// (an open tab during a deploy) or a message that cannot be formatted shows the
// generic text, never the raw key; `onError` hears of it. next-intl's own
// default would write to console.error, which the lint keeps out of src.
// English only until the locale arrives (feature 11, step 1).
export function createErrorText(
  onError: (error: Error) => void = ignore,
): ErrorText {
  const translate = createTranslator({
    locale: "en",
    messages: { errors },
    namespace: "errors",
    onError,
    getMessageFallback: () => errors.generic,
  });
  return (ref) => {
    const { error, params } = typeof ref === "string" ? { error: ref } : ref;
    return translate(error, params);
  };
}
