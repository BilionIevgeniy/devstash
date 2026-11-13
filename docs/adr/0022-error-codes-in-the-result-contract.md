# 0022. A failure carries an error code, not a sentence

- Status: accepted
- Date: 2026-11-13

## Context

The interface is going to be English and German (feature 11). Before this change every service, Server Action and route answered a failure with an English sentence ([ADR 0021](0021-result-contract-and-shared-building-blocks.md): `fail("Item not found")`, `GENERIC_ERROR_MESSAGE`). The words were decided on the server, in about 100 files, often in `domain/` constants with numbers built into them (`` `Up to ${TAGS_MAX} tags` ``), and the browser compared texts to decide what to show (`result.error === REAUTH_REQUIRED_MESSAGE`). A second language would have meant passing the locale into every service and keeping two sentences next to every check.

## Decision

- **The contract.** `Failure` is `{ success: false, data: null, error: ErrorCode, params? }`. `ErrorCode` is a key of `src/i18n/messages/en/errors.json`, so `tsc` refuses a code with no text. `params` holds the values the message needs (`{ minutes }`, `{ limit }`, `{ max }`), and the key is left out when there are none. `fail(code, ...params)` requires the params of a code that has placeholders: `ERROR_PARAM_NAMES` in `src/i18n/error-codes.ts` lists them, because a JSON import types every message as `string`, and a test checks the list against the ICU arguments of each message. `failFrom(ref)` builds a failure whose code is known only at run time (a refused input, a route's answer); `toErrorRef(failure)` keeps only the code and params for a failure stored as data (the import summary)
- **Passing a failure on.** An action returns the service's failure as it is (`if (!result.success) return result`), never `fail(result.error)`, which would drop the params
- **Where the words are made.** Only at the edge that shows them: `useErrorText()` (`components/common/hooks/use-error-text.ts`) in components and hooks, `getErrorText()` (`lib/error-text.ts`, server only) in server components. Both return `errorText(failure | code)`, built by `errorTextFrom` (`src/i18n/error-text.ts`) on next-intl's translator of `errors` (ICU plurals); a test of a plain helper builds one with `createErrorText` (`test/error-text.ts`). A plain helper that toasts (`callAction`, `rejectInvalidContent`, `submitNewItem`) takes `errorText` from its caller; a browser helper that fetches returns the failure (`routeError`, `downloadExport`, `AiStreamRequestError.failure`)
- **Unknown codes.** A code this build does not know (an open tab during a deploy) or a message that cannot be formatted shows the `generic` text, never the raw key. The server reports it through `logger.warn`; the browser has nowhere to report it
- **Zod.** Every schema message is a code. `firstIssue(error, fallback?)` in `lib/validation.ts` replaces `firstIssueMessage`: it returns the failure of the first issue, with `{ max }` or `{ min }` from a length check when the code's message has that placeholder, and the fallback for a message that is not a code (a Zod default)
- **`domain/` stays pure.** It cannot import `ErrorCode` (lint), so it returns literal codes with no annotation (`tooLargeError`, `AI_FAILURE_CODES`, `contentError`), and `tsc` checks them where they reach `fail()`
- **JSON routes.** `jsonError(failure, status, headers?)` answers `{ success: false, data: null, error: "<code>", params? }`. `routeError(response, fallback)` (`lib/route-error.ts`, replacing `routeErrorMessage`) reads it back and checks the code at run time. **Codes are part of the public API**: new codes are added, none is renamed or deleted
- **What stays text.** A thrown `Error` that never reaches the user, and log messages
- **Lint.** The ban on the literal generic text now applies in all of `src` (its text lives only in `errors.json`), and the ban on `.issues[0]` points to `firstIssue`

## Options considered

- **Translate on the server, with the locale passed into every service:** rejected. Every service would take a locale it has no other use for, and a failure stored as data (the import summary) would be frozen in the language of the request that made it
- **`error` as an object `{ code, params }`:** rejected. It changes the shape every caller reads; a string code in `error` with `params` beside it keeps `result.error === "reauthRequired"` readable and the JSON shape of ADR 0021
- **A field named `values`:** rejected, because `FormActionState.values` already holds a form's own fields, and a spread of one into the other would mix them

## Consequences

- English text is unchanged: the e2e suite still finds the same words. Two developer sentences ("Failed to create verification token", the one for a reset token) became the generic error, and the Resend vendor message no longer reaches the user (`emailSendFailed`)
- Tests of services and actions compare codes; tests of components still assert the English the user reads
- [ADR 0021](0021-result-contract-and-shared-building-blocks.md) still holds for the shape of a result and the building blocks; its `fail(error: string)`, `GENERIC_ERROR_MESSAGE` and `firstIssueMessage` are replaced here
