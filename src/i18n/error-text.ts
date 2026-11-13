import type {
  ErrorCode,
  ErrorParams,
  ErrorRef,
  PlainErrorCode,
} from "@/i18n/error-codes";

/** The text of a failure, or of a code whose message needs no params. */
export type ErrorText = (ref: ErrorRef | PlainErrorCode) => string;

/** A translator of the `errors` namespace, as next-intl hands one out. */
export type ErrorTranslator = (code: ErrorCode, params?: ErrorParams) => string;

/** The ErrorText of a translator: `useTranslations("errors")` or `getTranslations("errors")`. */
export function errorTextFrom(translate: ErrorTranslator): ErrorText {
  return (ref) => {
    const { error, params } = typeof ref === "string" ? { error: ref } : ref;
    return translate(error, params);
  };
}
