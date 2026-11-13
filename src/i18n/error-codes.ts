import errors from "@/i18n/messages/en/errors.json";

// The codes a failure carries instead of a sentence (ADR 0022). A code is a key
// of the `errors` messages, so tsc refuses one that has no text. Codes are part
// of the public JSON API: new ones are added, none is renamed or deleted.
// Imported by client components too: no server-only import here.

export type ErrorCode = keyof typeof errors;

// The placeholders of the codes that have them, in their ICU messages. A JSON
// import types every message as `string`, so next-intl cannot infer them: this
// map does, and `error-codes.test.ts` checks it against the messages.
export const ERROR_PARAM_NAMES = {
  tooManyAttempts: ["minutes"],
  itemLimitReached: ["limit"],
  collectionLimitReached: ["limit"],
  passwordTooShort: ["min"],
  passwordTooLong: ["max"],
  profileNameTooLong: ["max"],
  nameTooLong: ["max"],
  titleTooLong: ["max"],
  descriptionTooLong: ["max"],
  contentTooLong: ["max"],
  urlTooLong: ["max"],
  languageTooLong: ["max"],
  tagTooLong: ["max"],
  tooManyTags: ["max"],
  tooManyCollections: ["max"],
  aiInputTooLong: ["max"],
  importTooManyItems: ["max"],
  importTooManyCollections: ["max"],
  importFileTooLarge: ["max"],
} as const satisfies { readonly [Code in ErrorCode]?: readonly string[] };

type ParamCode = keyof typeof ERROR_PARAM_NAMES;

/** A code whose message has no placeholder: it can stand alone. */
export type PlainErrorCode = Exclude<ErrorCode, ParamCode>;

export type ErrorParams = Readonly<Record<string, string | number>>;

/** The arguments `fail` takes after the code: the params when it has any. */
export type ErrorArgs<Code extends ErrorCode> = Code extends ParamCode
  ? [
      params: {
        readonly [Name in (typeof ERROR_PARAM_NAMES)[Code][number]]:
          string | number;
      },
    ]
  : [];

/** A failure as far as its text is concerned: the code and its params. */
export interface ErrorRef {
  error: ErrorCode;
  params?: ErrorParams;
}

/** A code with the params its message needs, checked like the arguments of `fail`. */
export function errorRef<Code extends ErrorCode>(
  code: Code,
  ...[params]: ErrorArgs<Code>
): ErrorRef {
  return toErrorRef({ error: code, params });
}

/** Only the code and params of a failure, for a failure kept as data (a summary). */
export function toErrorRef({ error, params }: ErrorRef): ErrorRef {
  return params === undefined ? { error } : { error, params };
}

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && Object.hasOwn(errors, value);
}
