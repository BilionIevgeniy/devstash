# 0024. The locale: a cookie for the app and the auth pages, an explicit locale for static pages

- Status: accepted
- Date: 2026-11-13

## Context

The interface is English and German (feature 11). Public pages must stay static, and the root layout reads no cookie or header (cross-file decision 1 of the feature plan). next-intl's usual setup puts the locale in the URL (`app/[locale]/…`) and composes its proxy with ours. That would move every route, the intercepting item drawer and the auth pages included, and put two proxies in front of Auth.js. In next-intl 4.15.1, the APIs that make a page outside `[locale]` static, `setRequestLocale` and the `requestLocale` of the request config, are deprecated in favour of root params, which need the locale segment again. The lint fails on deprecated APIs.

## Decision

- **No locale in the URL of the app or of the auth pages.** Their locale is the cookie `devstash-locale` when the user has chosen one, else the first supported language of `Accept-Language`, else English (`resolveLocale` in `src/i18n/config.ts`, unit-tested). The cookie is set only by an explicit choice: the language switch of the user menu (the Server Action `setLocale`) or the language link of the homepage (`POST /api/locale`, amended 2026-11-14), both through `setLocaleCookie` (`src/lib/locale-cookie.ts`): httpOnly, SameSite=Lax, Secure in production, one year, path `/`. It is not cleared on sign-out, so the choice survives a sign-out and a sign-in. It is a preference the user asked for, so it needs no consent (§ 25 (2) Nr. 2 TDDDG), and it is listed in the privacy notice and the processing record
- **The marketing page exists twice, `/` and `/de`, both static.** Their layouts and pages hold the locale as a constant and pass it down. Server components call `getTranslations({ locale, namespace })`, and the request config takes an explicit locale without reading a request API. Pages of the marketing group never call `getLocale()`, `getMessages()`, `getFormatter()` or `getTranslations()` without a locale, `useTranslations` in a server component, or next-intl's server `NextIntlClientProvider`: each reads the cookie and turns the page dynamic. The guard is the build output: `/` and `/de` are `○`. Their client components get only the namespaces they show (`pickMessages`)
- **The homepage's language link** goes to the other homepage and, from `/` or `/de`, keeps the scroll position (the same sections in the same order); from a legal page it opens at the top. The click also sends `POST /api/locale` without waiting. A route and not a Server Action: an action that sets a cookie refreshes the current page, which would race the link's navigation. The route needs no session and no rate limit (it stores nothing but the caller's own cookie); since a route has no built-in origin check, it takes only `application/json` (a cross-site fetch with it needs a preflight the route never answers) and refuses a `Sec-Fetch-Site` other than `same-origin`. A request without that header (an older browser) is accepted on purpose: the JSON-only rule already stops a cross-site form, and the cookie only affects the caller
- **The request config lives in `src/lib/i18n-request.ts`**, not in `src/i18n/` as [ADR 0023](0023-next-intl-outside-lib.md) expected: it needs the logger and `next/headers`, and `src/i18n/` imports no other layer. `next.config.ts` points the plugin there
- **One client provider per layout:** `I18nProvider` (`components/common`) wraps next-intl's client provider with the same time zone (`Europe/Berlin`), named formats (`FORMATS`) and fallback as the server, because functions cannot cross from a server layout. It renders no element. `(app)` and `(auth)` pass every message: they are dynamic, and a namespace left out would fail only on the screen that needs it. In `(app)` it is the outermost element, because the editor preferences show their errors through it
- **The auth pages move into the route group `(auth)`** with one layout for the provider; their URLs do not change
- **`<html lang="en">`** stays in the root layout. Each layout puts `lang` on an element it already has (the auth column, the shell, the marketing wrapper), so no extra element breaks a flex layout
- **The root error and not-found pages** (`error.tsx`, `global-error.tsx`, `not-found.tsx`) are bilingual by design, like the legal pages, and the literal-string lint leaves them out by name. The two error pages render outside every provider and cannot read the httpOnly cookie. The root not-found could read it, but it wraps every page: a request API there makes `/`, `/de` and the legal pages dynamic (found in the build output of step 5)
- **A missing message** of `errors` shows the generic error, never the key; any other missing key shows its path, so it is noticed (`messageFallback`). Keys are typed (`src/i18n/next-intl.d.ts`): a key English lacks fails `tsc`. ICU arguments are not typed (a JSON import types each message as `string`); a test formats every message of both locales
- **Dates** are shown in `Europe/Berlin` (before: UTC), through next-intl's formatter and the named formats

## Options considered

- **A `[locale]` segment for everything:** rejected for the reasons above
- **The locale in the session or the user row:** rejected. The auth pages are seen signed out, and a preference that needs no account should not need a database write
- **A cookie readable by the browser,** so the root error pages could know the locale: rejected; httpOnly keeps the same shape as the other cookies, and two error pages being bilingual costs nothing

## Consequences

- `/register`, `/sign-in`, `/forgot-password` were static and are now dynamic: they read the cookie
- Moving from `/de` to a legal page (one bilingual page under the English header) remounts the header and switches it to English
- "Registrieren" on `/de` leads to `/register`, whose language is the cookie or the browser's. A visitor who opened `/de` directly, with an English browser and no cookie, gets the English form: the page itself sets no cookie, only the language link does. One who switched with the link gets German, unless they click within the round trip of `POST /api/locale`, which the navigation does not wait for
- A signed-in user who switches on the homepage switches the app too: it is the same explicit choice. A Cmd or Ctrl click opens the other homepage in a new tab and still sets the cookie
- An upgrade of next-intl that removes the explicit locale override would make the marketing pages dynamic; the `○` check in the build shows it
