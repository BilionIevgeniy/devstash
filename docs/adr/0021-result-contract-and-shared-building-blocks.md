# 0021. One result contract, and shared building blocks with one home each

- Status: accepted; its error text (`fail(error: string)`, `GENERIC_ERROR_MESSAGE`, `firstIssueMessage`) superseded by [0022](0022-error-codes-in-the-result-contract.md)
- Date: 2026-11-13

## Context

[ADR 0003](0003-services-for-every-write.md) named the result types: services return `OperationResult`, Server Actions `ActionResult<T>`. `src/lib/action-result.ts` declared them as types only, with `success: boolean` and `error: string | null`, and gave no way to build one. So every action, route and service wrote its own:

- 21 files had a local `function failure(...)`
- About 60 literals spelled `{ success: false, … }` by hand
- 10 services declared their own `interface XResult extends OperationResult { data: X | null }`
- 15 files had their own copy of "Something went wrong. Please try again."
- 38 sites read `parsed.error.issues[0].message`

The loose type helped nothing: a caller that had checked `success` still could not read `data` without a second check (`!result.success || !result.data`), nor `error` without a fallback (`result.error ?? X`). The architecture rules said where code goes, and the lint checked that. Nothing said that a small helper has one home, and the code review counted the repeated shape of thin entry points as the rule, not as a finding.

## Decision

- **One contract.** `OperationResult<T = null>` is a discriminated union, `Success<T> | Failure`, with the same three keys on both sides (`success`, `data`, `error`), so the JSON shape the browser and the routes read does not change. `ActionResult<T>` stays as its alias, because ADR 0003 and the rules name both
- **Built in one way.** `ok(data)` or `ok()`, and `fail(error)`. A service whose success always has data returns `OperationResult<X>` (not `X | null`), so a checked result needs no second check and a failure always has its message. `GENERIC_ERROR_MESSAGE` lives beside them. The file has no `server-only`, logger or Node import: client components import it
- **The `??` rule.** After a typed call (a service, a Server Action), the failure branch reads `result.error` as it is. A fallback stays only where JSON is parsed and cast in the browser (`fetch-register`, `fetch-item-detail`, `fetch-search-results`, `fetch-collection-options`), because the cast trusts any body, a proxy's included
- **The first Zod issue.** `firstIssueMessage(error, fallback?)` in `lib/validation.ts`, also in the browser (`parseImportFile`)
- **The idle state of a form.** A form on `useActionState` whose state is an `ActionResult` starts from `null` (`SignInForm`, `ForgotPasswordForm`), since "no answer yet" is neither a success nor a failure
- **Lint.** `no-restricted-syntax` bans `.issues[0]` (also `?.[0]`) and the literal generic text everywhere in `src` except their homes and the tests. Each ban has its own message. A later flat-config block that sets the rule replaces it for its files, so every block builds the rule through `restrictSyntax`, which always puts the shared bans first. The ADR 0009 read/write selectors of services, queries and the search ranking keep working (checked with `npx eslint --print-config`)
- **Building blocks, one home each.** Further shared helpers (the route responses, the signed-in user id of a route, the dialog and toggle hooks) follow the same rule. The list with paths is in "Shared building blocks" in `context/coding-standards.md`: check it before writing a helper, and extract a second copy in the same change

## Options considered

- **A generic `runAction()` wrapper** for the parse, session, try, call and catch of every action: rejected. The session read must stay outside the `try` (its redirect throws), sign-in handles `AuthError`, and only some actions call `refresh()`. After `ok`/`fail` an action is a few readable lines; a wrapper would hide that control flow
- **A lint ban on every `{ success: false }` literal:** rejected. It also matches shapes that are deliberately not a result (`AiAccess` with its `reason`, the import parser's `ParsedImportFile`, `RegisterResult`, `RateLimitResult`), and a ban on the name `failure` is avoided by another name. The review checks it instead
- **jscpd as a required CI check:** rejected. Thin entry points and the Radix dialog markup are parallel on purpose, and a gate leads to ignore comments. It runs as a report in `/cleanup`

## Consequences

- A test that compared a service's answer with `{ success, error }` now includes `data: null`
- "A failed result with no message" can no longer be built, so the test of that case went
- A new helper that repeats one in the list is a review finding, not a style choice
