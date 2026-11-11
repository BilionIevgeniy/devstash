# 0016. Error monitoring with Sentry: what leaves the server, and how it is kept small

- Status: accepted
- Date: 2026-11-11

## Context

An error in production went to `console.error`: Vercel's logs with a short retention, or the browser console of the one user who saw it. A failed Stripe webhook or AI stream left no record anyone looks at. [ADR 0014](0014-launch-mode.md) planned Sentry as a vendor and said that enabling it needs a new record of the cookie and consent position. This is that record.

Sentry is easy to switch on, and in version 11 it collects a lot by default. `sendDefaultPii` is gone; its replacement, `dataCollection`, defaults to collecting cookies, request headers and bodies, query strings, the variables of every stack frame and database query data. The setup wizard adds tracing, a tunnel and session tracking. In this app the reset and verification links carry a one-time token in the query, and the message of a Prisma error quotes the arguments of the failed call (an email address, an item title).

## Options

1. **Vercel logs only.** Nothing new to disclose, but a short retention, no grouping, no alert and nothing from the browser.
2. **A self-hosted tool** (GlitchTip or Sentry itself). The data stays with us, but it is one more service to run and patch for a one-person project.
3. **Sentry as the wizard sets it up.** Quick, with the defaults above.
4. **Sentry in its EU data region, set up by hand,** with everything optional switched off and each event rebuilt before it leaves.

## Decision

Option 4: `@sentry/nextjs` 11 (pinned), an organization in the EU data region (the DSN host ends in `.de.sentry.io`).

### What leaves, and what never does

| Part of an event | Sent                                                                                                                                                                                                      | Never sent                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| The error        | its class name, a sentence the calling code wrote, the stack frames (file, function, line, column)                                                                                                        | the message of the error, source lines, the variables of a frame                      |
| The request      | the method, the route (`/items/[type]/[id]`), the URL path                                                                                                                                                | headers, cookies, bodies, the query string, the fragment                              |
| The application  | the release (git commit), the environment (`production`, `preview`, `development`), the kind of entry point (`render`, `route`, `action`), the digest of a server error, the OS and runtime of the server | the host name, package versions, timezone and locale, the browser and OS of a visitor |
| The person       | `user.id` (a cuid), only where the failing code knows a signed-in user                                                                                                                                    | email, name, username, IP address                                                     |
| Everything else  | ids as tags where the calling code has them (`itemId` in the item services, `stripeEventId`, `customerId`)                                                                                                | breadcrumbs, `extra` data, session counts, trace headers, client reports, Replay      |

The IP address of the connection reaches Sentry's ingest as it does with any HTTP request. The project setting "Prevent Storing of IP Addresses" is on, so it is not stored; that setting lives in Sentry, not in code, and is the owner's to keep.

### Three layers keep it that way

1. **The SDK collects nothing optional** (`dataCollection` all off, no breadcrumbs, no tracing, no trace headers, no client reports, no Replay, no sessions). Without trace headers, Stripe, OpenAI, Resend, R2 and Upstash get no `sentry-trace` or `baggage`: the SDK adds them to every outgoing server request by default
2. **Every event is rebuilt before it leaves** (`scrubEvent` in `lib/sentry-scrub.ts`, as `beforeSend`). It does not delete what is known to be bad: it builds a new event from the fields listed in the table, so a field that a later SDK version adds stays out until it is listed. The message of an event is blanked unless the event is marked as written by our code
3. **The capture functions hand over a safe stand-in** (`lib/error-summary.ts`). `safeError` keeps the class name and only the lines of the original stack that are frames, never a slice of it: the first lines of a stack hold the message, which can run over many lines

### Where the code lives

- `lib/sentry.ts` is the vendor client: the options both halves share, the browser init, the capture functions. `lib/sentry-server.ts` is the server init, apart because the browser build of the SDK has no `httpIntegration`. `lib/sentry-scrub.ts` and `lib/error-summary.ts` are pure and import only types
- `src/instrumentation.ts` and `src/instrumentation-client.ts` call into `lib`; `next.config.ts` (`withSentryConfig`) is the one file that imports the SDK directly, outside `src/` and so outside the lint rule. `@sentry` is added to the vendor SDK pattern, so nothing else under `src/` can import it. The Node.js runtime is the only one started: no route sets `runtime = "edge"` and the proxy runs on Node.js
- `lib/logger.ts` replaces every `console.*` in `src/` (a lint error now). Its contract is in "Logging" in `context/coding-standards.md`: a fixed message, ids under keys that end in `Id`, the error as its class and codes. `error()` reports to Sentry and returns the promise of the flush, which callers `await` (`no-floating-promises`), because a serverless function can freeze after it answers with the event still queued. One failure is reported once a minute per instance, so a dependency that is down does not burn the quota
- The three error boundaries share `useReportError` (`components/common/hooks/`). It reports only an error that has no digest: one that has a digest was already reported by `onRequestError`, so the same error would be two events. The page shows the digest as a reference, and the server event carries it as a tag, so what a user sees finds the event. This extends the rule of [ADR 0007](0007-client-hooks-in-the-components-role.md): a hook with no feature knowledge that several routes of `app/` share goes to `components/common/hooks/`, not only one that two features share

### Smaller decisions

- **Sessions.** The server SDK counted every request as a "session" and sent the counts to Sentry once a minute, errors or not. The Http integration of the Next.js SDK is replaced by the same one with `sessions: false`, and `ProcessSession` is removed. The browser starts only the integrations on a list of names (`CLIENT_INTEGRATIONS`)
- **Source maps** are uploaded and deleted from the build only when `SENTRY_AUTH_TOKEN` is set (Production). Without it the build generates no source maps at all, so a preview or a CI build has none to serve. A failed upload warns and the deploy goes on
- **The environment** comes from `VERCEL_ENV` through `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, set in `next.config.ts`, because `VERCEL_ENV` itself is not in the browser. The alert for new issues filters on `production`
- **Bundle.** The browser SDK costs about 33 KB gzip (93 KB raw) on every page, the public homepage included, after `excludeTracing` and `excludeDebugStatements` took out about 40 percent of it. The init is a static import in `instrumentation-client.ts` because only synchronous top-level code is certain to finish before hydration

- **A key of its own for the server.** The DSN of the browser ships in the page, so anyone can post events with it, and a flood of forged ones would use up the quota and the rate limit of that key before a real error of the server arrived. `SENTRY_DSN` is an optional second client key of the same project, read only on the server and never built into the bundle; empty, the server falls back to the public key. In Sentry the browser key gets a rate limit and Allowed Domains, which filter casual abuse and are not a boundary
- **The EU region is enforced, not only documented.** `sentryBaseOptions` uses a DSN only when its host (parsed, never matched in the text, so `https://k@evil.com/?x=.de.sentry.io` does not pass) ends in `.de.sentry.io`, or is `localhost` or `127.0.0.1`, the stand-in ingest of the check below. A DSN that does not parse is off, and never an exception at the start of the server or of the page
- **Browser extensions.** `denyUrls` drops the errors of scripts that an extension injects: they are not ours to fix, and a frame from one names an extension the visitor has installed
- **Auth.js writes its own errors** with `console.error`, the stack of the cause included, which starts with the message of a Prisma error. `nextauth/auth-logger.ts` replaces that writer: a refused sign-in (`CredentialsSignin` and the two errors of the auth feature that extend it; the class is checked, because their `name` is their own) is a `warn` line, anything else goes through `logger.error` with the error that was thrown inside Auth.js. The hook is synchronous, so the flush of that event cannot be awaited
- **The logger never rejects.** A failing monitor must not change what a caller does next: most callers `await` it inside a `catch`, and the rate limiter, for one, must go on to throw its own `RateLimitUnavailableError`. Its line also holds the frames of the error (ten at most), so a log with no DSN, or a repeat inside the throttle, still says where
- **Upgrades are guarded by two tests that run the real SDK.** `lib/sentry-integrations.test.ts` pins the default integrations of the Node build, and `lib/sentry-client-integrations.test.tsx` starts the real browser init and asserts the seven names it keeps. A Dependabot PR for `@sentry/nextjs` that turns them red is the prompt to decide for each new name whether it may stay; a Sentry bump is merged only after the check below is repeated

### The consent position

The browser SDK sets no cookie and writes nothing to `localStorage`, `sessionStorage` or IndexedDB, and it sends nothing until an error occurs (both checked below). So the position of ADR 0014 holds: § 25 TDDDG needs no consent for it. The legal basis for the processing is Art. 6 (1) f GDPR (the legitimate interest in finding and fixing errors). `docs/privacy/processing-record.md` and the privacy notice name Sentry in the same change.

## Verified on the wire (2026-11-11)

A production build with the DSN pointing at a local server that records every request, driven in Chromium, with temporary routes that throw in a Server Component, a Route Handler, a Server Action, a client component and an event handler, and one that calls `logger.error`:

- Four pages and 75 seconds of idle with traffic: 0 requests to the ingest. No cookie of Sentry and nothing in `localStorage`, `sessionStorage` or IndexedDB
- One event for each error, never two. The digest tag of a Server Component and of a Server Action equals the reference on the error page. A Route Handler error has the route and no digest: Next.js creates digests only in the React renderer
- A client render error (through the boundary) and an event handler error (through the global handlers) each arrive once
- The event of `logger.error` has the fixed message, `user.id` and an id tag, and reached the ingest no later than the moment the route built its answer
- None of the strings that the test errors and URLs carried (a token in the query, an email address, an item title, the text of a Prisma-like message) is in any body. The frames hold only file, function, module, line, column and `in_app`
- The server's own outgoing request carries no `sentry-trace`, `baggage` or `traceparent`
- The first run found the `sessions` envelope described above; it was switched off and the second run showed only `event` items

The check is manual. To repeat it after an upgrade of `@sentry/nextjs`, do the same with the same assertions, and remove the temporary routes afterwards. `context/todo.md` lists automating it.

## Consequences

- Browser events carry no browser or OS: the integration that would add them also adds headers and the URL, which are scrubbed. A bug that depends on the browser needs the `User-Agent` added back on purpose
- An error that nobody caught has no message in Sentry, only its class and frames. Next.js itself writes such an error to the Vercel log with `console.error`, message included, so what a log holds is as private as the retention of Vercel's logs. "Never the message" is the rule for the calls of our own code (`context/todo.md` keeps the item)
- The browser list is of names. A name that changes in a new version drops an integration silently: an error goes unreported and nothing leaks. The two tests above turn that into a red build, and the check above is repeated before a Sentry bump is merged
- The Developer plan keeps events for 30 days and has a small monthly quota; the throttle is for that. A user id in an event goes when the event expires, or earlier when the owner deletes the issue; there is no per-user deletion
- Sentry is a US company with EU storage; the DPA, the transfer mechanism and the setting "Use of aggregated identifying data" (off) are the owner's to confirm in the record

## Not verified yet

- Readable stack traces: the upload and deletion of source maps with the real token run only in the Production build. Check the first production error for a mapped stack
- A caught error in the Stripe webhook is flushed before the answer (shown locally on `next start`); to be shown on the first Preview deploy
- The alert filter can only be set to `production` once Sentry has seen that environment: send one test error from the live site, then edit the alert
