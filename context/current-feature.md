# Current Feature: English and German (i18n)

## Status

In Progress

## Goals

- [done 2026-11-13, PR 0] Step 0, its own PR: services and Server Actions return error **codes**, not English sentences (change to `OperationResult`/`ActionResult` in `lib/action-result.ts`, with an ADR); components map codes to messages; Zod schemas return codes as messages; `domain/` stays pure (keys only, no next-intl import)
- next-intl set up without i18n routing: `src/i18n/request.ts` (`getRequestConfig`: cookie, then `Accept-Language`, default English), `messages/en.json` and `messages/de.json`, the plugin in `next.config.ts`, the client provider where client components need messages
- Strings translated in mergeable steps: (1) marketing page (`/` and `/de`) and footer, (2) auth pages and emails (Resend templates per locale), (3) app shell (sidebar, top bar, menus, empty states, toasts), (4) item and collection screens, settings, billing
- Language switch in the user menu (Server Action sets the cookie, then `refresh()`) and links between `/` and `/de` on the marketing page
- Dates, relative times and numbers through next-intl formatters, with the user's locale and `Europe/Berlin` as the default time zone (`10.11.2026` / `vor 2 Stunden`, `11/10/2026` / `2 hours ago`)
- Type-safe message keys (next-intl TypeScript augmentation): a missing key fails `tsc`
- ESLint guard against literal strings in JSX on `src/**/*.tsx` (e.g. `eslint-plugin-i18next` `no-literal-string`, excluding `components/ui` and tests); confirm ESLint 9 flat-config support or name an equivalent in the plan
- Acceptance: `/` and `/de` are static in the build output with the full marketing page each; switching language changes every app and auth screen, email and error message, and survives sign-out and sign-in; no hard-coded user-facing English string left in `src/`; build, tests and the E2E smoke suite stay green

## Notes

- Spec: `context/features/11.i18n-en-de.md`. Decisions are cross-file decision 1 in `context/features/README.md`; record them in ADRs
- Library: next-intl; verify every API against the installed version
- Public pages stay static: the root layout never reads cookies or headers. `/` (English) and `/de` (German) are two static pages rendering the same components with an explicit locale. Legal pages stay bilingual on one static page (feature 2)
- Auth pages and the app: locale from a cookie set only when the user picks a language, else `Accept-Language`, else English. No `[locale]` segment: it would move every route (including the intercepting drawer and auth pages) and force composing the next-intl proxy with the Auth.js proxy
- `<html lang="en">` stays in the root layout; German content sets `lang="de"` on its top wrapper element
- next-intl is a vendor library used outside `lib/` (components and pages call its hooks): ADR for the exception to the vendor rule, and `src/i18n/` (config and messages only) added to the Layout in `architecture-rules.md`
- The language switch lives in `app-shell`, unless the plan review picks a new `i18n` module with its own `FEATURE_RANKS` row
- The language cookie is a preference set on an explicit user action: list it in the privacy notice (feature 2) and `docs/privacy/processing-record.md`
- Non-goals: more languages, translated user content, localized URL paths for the app, translating AI output
- Tests: unit for locale resolution (cookie > header > default); RTL for a component rendering German strings with the provider; E2E: switch to German, reload, still German; `/de` renders German without a cookie
- Docs to update: ADRs (locale decision; next-intl outside `lib`; error codes), `context/architecture-rules.md` (Layout: `src/i18n/`), `context/coding-standards.md` (no literal UI strings, error codes), `docs/architecture.md`, `docs/privacy/processing-record.md`
- Read first: next-intl App Router without i18n routing, next-intl static rendering with an explicit locale, `node_modules/next/dist/docs/` guides/internationalization, MDN `lang`
- Handbook: module 18 (i18n and accessibility)
- Step 0 review, left for the step that translates settings: `DeleteAccountDialog` builds a sentence from the `reauthRequired` error text plus ", then come back here to finish."; it needs one UI string of its own, since German word order breaks the join

## Model

- Plan: opus (row "A new module or rank, a Prisma migration, auth, billing, a different data flow, a change to a lint rule": changes the result contract of every service and action, adds a lint rule and an exception to the vendor rule, touches auth pages and emails, may add an `i18n` module)
- Implementation: opus (same row)
- architecture-reviewer: opus (same row)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
