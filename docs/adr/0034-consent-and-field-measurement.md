# 0034. Consent and real-user Web Vitals

- Status: accepted
- Date: 2026-11-19

## Context

DevStash measured its speed only in the lab (Lighthouse and Playwright on the production build, `docs/performance.md`). A real product also measures what its visitors get: LCP, INP and CLS from their browsers. In Germany, reading such data in a visitor's browser falls under § 25 TDDDG, and feature 13 left the measurement out until there was a consent decision.

The constraints of the app shape the answer:

- The root layout reads no cookie and no header, so `/`, `/de` and the legal pages stay static ([ADR 0024](0024-locale-decision.md)). Whatever needs words on every page is mounted per provider layout.
- The Sentry browser SDK already runs on every page ([ADR 0016](0016-error-monitoring-with-sentry.md)), and the spec asks first whether it falls under the same rule.
- Zod stays out of the page JavaScript: the create form is its own chunk, preloaded at idle time (`docs/performance.md`).

## § 25 TDDDG: one test for Sentry and for the Web Vitals

§ 25 (1) TDDDG needs consent for storing information in the visitor's terminal equipment or for access to information already stored there, whatever the information is (not only cookies). § 25 (2) Nr. 2 exempts what is strictly necessary for the provider to deliver a service the user has expressly asked for. Both cases are measured against that exemption:

- **Web Vitals: consent needed.** The browser's Performance API holds the timings of the page; reading them and sending them away is access to information in the terminal equipment. The page works the same without it: measuring how fast it was serves the provider, not the service the visitor asked for. The guidance of the German supervisory authorities on telemedia (DSK, Orientierungshilfe für Anbieter:innen von Telemedien) treats reach and performance analytics as not strictly necessary.
- **Sentry: no consent, on the narrow reading of ADR 0016.** The SDK stores nothing (no cookie, nothing in `localStorage`, `sessionStorage` or IndexedDB) and sends nothing until an error occurs. When one occurs, it reads what that error left in the page (its class, its frames, the route) and sends a rebuilt event (ADR 0016). The service the visitor asked for has just failed; reporting that failure is what lets the provider deliver the service again. That is counted as strictly necessary under § 25 (2) Nr. 2, and Art. 6 (1) f GDPR stays its legal basis. This is a position, not settled law: an error report could also be read as a convenience of the provider. The lawyer's check before live includes it (`context/todo-before-live.md`); if it fails, the SDK starts only after the same consent.

Sources: [§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html); the DSK Orientierungshilfe Telemedien (current version on [datenschutzkonferenz-online.de](https://www.datenschutzkonferenz-online.de/orientierungshilfen.html)); ADR 0016 for what the Sentry SDK reads and sends.

## Decision

### The banner

- **One question:** may DevStash measure LCP, INP and CLS. Allow and Decline are the same kind of button, side by side, so neither is easier. The text names what is sent (three numbers and the kind of page) and what is not (the address, the user's content, a cookie), and links the privacy notice.
- **Where:** `ConsentRoot` (`components/common/consent/`) in each provider layout, next to the `AppToaster`: `MarketingFrame`, `(auth)/layout.tsx`, `(app)/layout.tsx`. Never in the root layout. The words are in `common.consent`, which the static pages already ship.
- **Storage:** the answer lives only in the browser, in `localStorage` under `devstash-consent` with a version (`lib/consent.ts`). No server read and no cache depends on it, so the static pages stay `○`. The store (`components/common/hooks/use-consent.ts`, a `useSyncExternalStore`) keeps the answer in memory too, so a click holds for the tab when storage is blocked, and follows another tab through the `storage` event. A new version of the banner asks everyone again.
- **No flash:** the server snapshot is "unknown", so nothing renders until the stored answer has been read after hydration; a visitor who has answered never sees the banner for a frame. No inline script.
- **Withdrawal:** "Privacy settings" in the footer of the marketing pages and of every app page opens the banner again, with the current answer and the focus on it. Withdrawing is one click, as agreeing is.
- **Layering:** a labelled region, not a dialog, under the dialog layer (`z-40`), so an open sheet or dialog never sits under a banner it would make inert.

### The measurement

- `WebVitalsReporter` calls `useReportWebVitals` with one module function, and is mounted only after Allow. web-vitals offers no way to remove its observers, and each provider layout mounts its own reporter, so the send (`send-web-vital.ts`) checks the answer again at every metric and sends each measurement once per document (keyed by the metric, the navigation, its URL and the value, so a later, larger INP or CLS still goes out). After a Decline nothing more leaves the page.
- **What is sent:** `{ name, value, group }`, with the name one of LCP, INP and CLS, and the group the page's pattern from a closed list (`lib/observability/web-vitals.ts` `pageGroup`: `/items/[type]/[id]`, never `/items/snippets/<id>`; anything unknown is `other`). The URL itself never leaves the browser. Sent with `fetch` and `keepalive`; a failure is lost.
- **The route:** `POST /api/vitals`, public, JSON only, refused when the browser says the request is cross-site (the checks of `/api/locale`). The body is checked by `parseWebVital`, a hand-written check without Zod, since the same module ships to the browser. The metric goes to the log through `logger.info` (`Web Vital <name> on <group>`, the value under `numbers`): no IP, no URL, no id. Nothing is stored.
- **Rate limit:** 30 a minute per IP, counted in the memory of each instance (`consumeLocalRateLimit`), never in Upstash. A lost metric costs nothing, while every beacon in Upstash would cost a command and, during an Upstash outage, a 500 and a Sentry event for each metric.
- **Rule 6:** the route calls `lib` alone, with no feature service, since no product data is behind it, only a log line. This is the second exception of rule 6 of "Where does this go" in `context/architecture-rules.md`, next to the daily cron.

## Consequences

- The field numbers prove the pipeline more than they measure the product: a portfolio has few visitors. Before/after numbers of a change stay the lab numbers of `docs/performance.md`.
- The privacy notice (both languages) and `docs/privacy/processing-record.md` name the measurement, its legal basis (consent, Art. 6 (1) a GDPR, and § 25 (1) TDDDG) and the log retention of Vercel. ADR 0014's consequence on Sentry and analytics is answered here.
- The e2e sessions carry a stored answer (`ANSWERED_CONSENT` in `e2e/support/storage-state.ts`), so the banner covers nothing in the journeys; `e2e/consent.spec.ts` starts as a fresh visitor.
- A later analytics tool, a session replay or Sentry tracing is a new question for the banner: a new version of the stored answer and an update of this record.
- The Sentry position above is the one item a lawyer could overturn. Then `initSentryClient` waits for the same consent, and the errors of visitors who decline go unreported.
