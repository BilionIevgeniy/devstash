# 0036. Content-Security-Policy

- Status: accepted
- Date: 2026-11-19

## Context

Since the audit hardening of 2026-10-31, `next.config.ts` sent a policy that covered only `frame-ancestors`, `object-src` and `base-uri`. Nothing limited where a page may connect, load images or start workers.

The usual strict policy is nonce-based: a fresh nonce per request, `script-src 'nonce-…' 'strict-dynamic'`. Next.js reads the nonce from the request's header while it renders, so every page must be rendered per request: the static marketing and legal pages (ADR 0024) would become dynamic, and the installed docs say Partial Prerendering, which Cache Components brings (ADR 0037), does not work with nonces. App Router also writes inline flight scripts (`self.__next_f.push`) on every page. `experimental.sri` adds integrity attributes to the external chunks only, and its support under Turbopack, the build default, is not verified.

## Decision

**A static header, built at build time, with exact origins and no nonce.** `buildContentSecurityPolicy` (`src/lib/http/csp.ts`, unit-tested) builds it from the build's environment; `next.config.ts` sends it with every response:

| Directive         | Sources                                                                      | Why                                                                            |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `default-src`     | `'self'`                                                                     | Anything not named below                                                       |
| `script-src`      | `'self' 'unsafe-inline'` (+ `'unsafe-eval'` in `next dev` only)              | The inline flight scripts; React's dev tooling uses `eval`                     |
| `style-src`       | `'self' 'unsafe-inline'`                                                     | Monaco, Radix and Sonner set style attributes and inject `<style>`             |
| `img-src`         | `'self' data: blob:`, the R2 bucket, `https://avatars.githubusercontent.com` | The gallery and file previews (signed GET URLs), upload previews, avatars      |
| `font-src`        | `'self' data:`                                                               | `next/font` serves its files from the app                                      |
| `connect-src`     | `'self'`, the R2 bucket, the Sentry ingest (+ `ws:` in `next dev`)           | The browser's PUT to R2, the browser SDK, the app's own routes (`/api/vitals`) |
| `worker-src`      | `'self' blob:`                                                               | Monaco's workers under `/monaco/`                                              |
| `frame-src`       | `'none'`                                                                     | The app embeds nothing                                                         |
| `object-src`      | `'none'`                                                                     | No plugins                                                                     |
| `base-uri`        | `'self'`                                                                     | No `<base>` that redirects relative URLs                                       |
| `frame-ancestors` | `'none'`                                                                     | No framing (with `X-Frame-Options: DENY`)                                      |

- **Exact origins, never a wildcard.** The R2 origin is the bucket's own host, `https://<bucket>.<account>.r2.cloudflarestorage.com`, where the SDK signs its virtual-hosted URLs; it is derived from `r2Endpoint` (`lib/vendors/r2-endpoint.ts`), the same function the S3 client uses, so the two cannot drift. `*.r2.cloudflarestorage.com` would let a script upload to any bucket, including an attacker's. The Sentry origin is the origin of the DSN that `allowedSentryDsn` (`lib/observability/sentry-dsn.ts`) accepts, the same guard the SDK uses: a DSN outside the EU region adds no origin and is not used either.
- **The Vercel Toolbar on previews only.** A preview deployment (`VERCEL_ENV=preview`) adds the toolbar's documented sources (`https://vercel.live` and the rest, `TOOLBAR_SOURCES` in `csp.ts`); production and the end-to-end build never name them.
- **No `form-action`.** The GitHub sign-in is a Server Action that redirects to github.com, and Chrome applies `form-action` to the redirect after a form post.
- **No `upgrade-insecure-requests`.** Vercel serves HTTPS with HSTS and every URL the app emits is relative or `https:`; the end-to-end server runs `NODE_ENV=production` over `http://localhost`, where an upgrade would break the stand-ins.
- **Report-only first, then enforced.** The policy went out as `Content-Security-Policy-Report-Only` until the end-to-end suite ran green with it; then it replaced the minimal enforced header. The fixture of `e2e/support/test.ts` fails any test on a CSP violation, enforced or report-only, on any page of its context; a lint rule makes every spec take `test` from there.
- **No external images in Markdown.** `MarkdownPreview` never loads an image: its alt text stands in, for an AI answer and for the user's own note alike. An image of another host would be blocked by `img-src` and show as broken, and allowing `img-src https:` would reopen the channel this policy closes (an image URL sends data the moment it renders). A visible change: a note that embedded an image from a docs site now shows the image's alt text.

### What it protects, and what not

- **It limits where data can go.** An injected script cannot `fetch`, `XMLHttpRequest`, `sendBeacon`, open a WebSocket or load an image anywhere but the app, its bucket and the Sentry ingest. No framing, no plugins, no `<base>` hijack, no worker from another origin.
- **It does not stop an injected inline script from running.** `'unsafe-inline'` lets any inline script run; the defence against injection stays where it was: React escapes text, Markdown renders without raw HTML and with React's URL sanitizing, no `dangerouslySetInnerHTML` of user data. An injected script can still read the page and act as the user through the app's own routes (`'self'`).
- **What a nonce would add**, at the cost of every page being dynamic and no static shell: inline scripts without the nonce would not run. Revisit if Next.js gains hashes for the flight scripts of static pages.

### Errors in the server's log

Next.js writes an error that nobody caught (a render, a route, an action) with its own `console.error(error)`, and the message of a Prisma error quotes the arguments of the failed call, so the Vercel log could hold an email address or a title. `register()` in `instrumentation.ts` installs `installSafeConsoleError` (`lib/observability/logger.ts`) after Sentry has started: an `Error` handed to `console.error` is written as its class, codes and frames, as `logger.error` writes one; text passes as it is. `e2e/egress.spec.ts` reads the test server's log (`scripts/e2e-start.ts` writes it to a file) after the throw routes ran and finds none of their secrets. Not covered: crash output of the process itself (an uncaught exception that ends it), which Node writes without `console`.

## Consequences

- A new origin the browser talks to (a CDN, an analytics endpoint, a second bucket) is a change of `csp.ts` with its test; the end-to-end fixture fails the first journey that meets a missing one
- The header is fixed at build time: a change of `R2_BUCKET_NAME`, `R2_ACCOUNT_ID` or `NEXT_PUBLIC_SENTRY_DSN` in Vercel needs a new deployment, as the DSN already did (it is inlined in the bundle)
- The end-to-end suite runs with the enforced policy and the stand-ins' origins, so a blocked part of the app fails CI. What it cannot see: the production origins themselves; `csp.test.ts` pins the shape of the production R2 and Sentry origins
