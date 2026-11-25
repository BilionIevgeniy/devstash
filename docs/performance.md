# Performance

How the size and speed of DevStash are measured, the numbers of feature 13 (performance and SEO), and what was decided from them. Measure before a change and after it, the same way, and write both here.

## How to measure

### Bundle size

The Turbopack analyzer (Next.js 16.1 and later; `node_modules/next/dist/docs/01-app/02-guides/package-bundling.md`):

```bash
npx next analyze --output --snapshot <name>       # builds and saves the analysis under .next/diagnostics/analyze
npx next analyze export --snapshot <name> > /tmp/<name>.jsonl
npx next analyze                                   # the interactive treemap on port 4000
```

- Give every measurement its own snapshot name (`baseline`, `after-dialog`, …): a name is replaced when it is used again, and the export reads a snapshot by name. Write the JSONL outside the repository; a later build may clear `.next/diagnostics`
- The numbers below are the client JavaScript a route loads before it is interactive: its `.js` chunks under `static/chunks`, minus the chunks only an async group (an `import()`) reaches, summed from the `compressed_size` of the export's `part` records. That sum is a little above the real gzip of a whole chunk, but it is the same method before and after, so the difference is real
- "Shared by app routes" is the set of chunks that `/dashboard`, `/items/[type]`, `/collections/[id]`, `/favorites` and `/settings` all load first

### Lab Web Vitals

Lighthouse 13.6 against the production build (`npm run build && npm run start`, or the server the end-to-end suite starts on port 3100), desktop defaults:

```bash
CHROME_PATH=<a Chromium> npx lighthouse@13.6.0 http://localhost:3100/ --only-categories=performance,seo,accessibility,best-practices
```

The app pages need a session, so their layout shift and the create dialog were measured from Playwright on the same build (a `PerformanceObserver` for `layout-shift`, and the time from the click to an editable Title field).

### Field data (real-user Web Vitals)

Since feature 20, a visitor who allows it in the consent banner reports LCP, INP and CLS from their browser ([ADR 0034](adr/0034-consent-and-field-measurement.md)): `useReportWebVitals` in `components/common/consent/WebVitalsReporter.tsx`, mounted only after Allow, sends each metric once with the group of its page (`/items/[type]`, never the URL) to `POST /api/vitals`, which writes one log line per metric. Read them in the Vercel runtime logs: search for `Web Vital`, the value is under `numbers.value` (milliseconds for LCP and INP, unitless for CLS). No Vercel Speed Insights.

A portfolio has few visitors, so the field numbers prove the pipeline; the before/after numbers of a change stay the lab numbers above.

## Feature 13 (2026-11-14)

### Client JavaScript per route (compressed, kB)

| Route                | Baseline | After the dialog split |           Change |
| -------------------- | -------: | ---------------------: | ---------------: |
| `/`, `/de`           |    359.6 |                  359.7 |                0 |
| `/impressum`         |    344.2 |                  344.3 |                0 |
| `/sign-in`           |    342.8 |                  342.8 |                0 |
| `/dashboard`         |    499.9 |                  437.7 |            −62.2 |
| `/items/[type]`      |    502.7 |                  440.7 |            −62.0 |
| `/collections/[id]`  |    503.6 |                  441.3 |            −62.3 |
| `/favorites`         |    540.9 |                  479.2 |            −61.7 |
| `/settings`          |    537.3 |                  485.2 |            −52.1 |
| Shared by app routes |    481.9 |                  428.1 | **−53.8 (−11%)** |

The largest parts of the shared app JavaScript after the split: Next.js and React (about 216 kB), the Sentry browser SDK (about 41 kB), the global CSS module (18 kB), TanStack Query (12 kB).

### The create dialog

- `CreateItemDialog` imported its whole form statically, and the top bar renders it on every app page: the fields, the editors' wrappers, the upload field, the collection select and the AI buttons shipped with every page. The form (`items/_internal/components/form/CreateItemForm.tsx`) is now its own chunk, loaded with `import()`: once the page is idle, on hover or focus of the button, or when the dialog opens. A plain `import()` and not `next/dynamic`, which is `React.lazy`: lazy suspends on its first render even when the chunk is already loaded, which would flash the skeleton, and it throws a failed chunk to the page's error boundary. A failed load shows its error with Try again inside the dialog
- The chunk is still downloaded on every app page, after hydration at idle time, so it no longer delays the first load
- With the chunk loaded (the normal case), the time from the click to an editable Title field was 46 to 99 ms over five opens on `/dashboard` (target: under 200 ms)
- The collection create and edit dialogs were left whole: the part that could move (`CollectionFields` and the form) is under 1 kB each, and the dialog shell would stay

### Lab results

| Page  | Performance | Accessibility | Best Practices | SEO |   LCP | CLS |   TBT |
| ----- | ----------: | ------------: | -------------: | --: | ----: | --: | ----: |
| `/`   |         100 |           100 |            100 | 100 | 1.2 s |   0 | 60 ms |
| `/de` |         100 |           100 |            100 | 100 | 1.2 s |   0 | 20 ms |

Layout shift on `/dashboard`, `/items/snippets`, `/items/images` and `/favorites` after load: 0.0013 each (good is below 0.1). The item images need no change: `ImageCard` draws its image in an `aspect-video` frame and the drawer in a fixed-height frame (`FILE_PREVIEW_HEIGHT`), so an image that arrives cannot move anything. The end-to-end user has no uploads (R2 is a dummy there), so no real image was loaded in this measurement; the frames hold by their CSS.

### Sidebar navigation

Each sidebar link carries `LinkPendingMark` and dims while its navigation is pending, after a 100 ms delay so a prefetched or fast navigation does not flicker. Every app segment has its own `loading.tsx` except `/profile` (feature 20 adds it).

## Feature 22 (2026-11-19): Cache Components

### How it was measured

- **App pages**: `e2e/perf/pages.perf.ts` (`npx playwright test --config playwright.perf.config.ts`) on the production build of the end-to-end suite, the signed-in run user, desktop Chromium on the same machine as the server and the Docker Postgres. One warm-up load per page, then the median of seven full loads: TTFB is `responseStart` of the navigation, LCP the last `largest-contentful-paint` entry. The queries are the `prisma:query` lines the server wrote during a load and its prefetches, with Prisma's query log switched on by hand for the measurement only (`log: ["query"]` in `lib/postgres/prisma.ts`, never committed); the server's log is `playwright/server.log`
- **500 favorites**: `e2e/perf/favorites-500.perf.ts`, a fresh Pro user with 500 starred snippets (`many-favorites` in `scripts/e2e-fixture.ts`), all 17 pages of `/favorites` loaded by scrolling, a `PerformanceObserver` for long tasks and for Event Timing (16 ms threshold) on the star of the last row
- **Production**: Vercel Observability is not available on the Hobby plan (the query answers 404), so the production numbers are the TTFB from outside, `curl` from Germany, median of seven

### App pages (lab)

| Page              | Before: TTFB |    LCP | Queries | Cache Components + Partial Prefetching: TTFB |    LCP | Queries | Cache Components (shipped): TTFB |    LCP | Queries |
| ----------------- | -----------: | -----: | ------: | -------------------------------------------: | -----: | ------: | -------------------------------: | -----: | ------: |
| `/dashboard`      |        12 ms |  40 ms |      32 |                                         4 ms |  36 ms |      58 |                             5 ms |  32 ms |      32 |
| `/items/snippets` |        10 ms | 360 ms |      19 |                                         6 ms | 344 ms |      52 |                             5 ms | 340 ms |      19 |
| `/favorites`      |        12 ms | 360 ms |      25 |                                         6 ms | 340 ms |      62 |                             5 ms | 340 ms |      25 |
| `/collections`    |        12 ms | 348 ms |      21 |                                         6 ms | 344 ms |      56 |                             6 ms | 344 ms |      21 |

- TTFB fell by about half with Cache Components: the shell streams before the page's reads are done. LCP barely moved; on the list pages it is the first card's text after its fonts
- Partial Prefetching more than doubled the queries of a page view for no gain in TTFB or LCP: every app route reads the session, so each visible link's App Shell prefetch is a server render with its own reads. It is off ([ADR 0037](adr/0037-caching-strategy.md))

### /favorites with 500 favorites

|                                     | Before | After |
| ----------------------------------- | -----: | ----: |
| Long tasks while 17 pages load      |      0 |     0 |
| DOM nodes with 500 rows             |  8,757 | 8,758 |
| Star on the last row (Event Timing) |  24 ms | 24 ms |

No long task and a star answered within one frame and a half: no virtualization (`@tanstack/react-virtual` stays out, as feature 12 decided). The 12.5 s to load all pages is the test's scroll loop, a page per scroll; the requests themselves are fast.

### Production (from outside, 2026-11-19, before this deploy)

| Page                   | Served by                | Median TTFB | Min–max     |
| ---------------------- | ------------------------ | ----------: | ----------- |
| `/impressum`           | the edge in `fra1` (HIT) |      114 ms | 63–511 ms   |
| `/`                    | the edge in `fra1` (HIT) |      243 ms | 105–801 ms  |
| `/sign-in`             | a function in `iad1`     |      245 ms | 209–2233 ms |
| `/vertraege-kuendigen` | a function in `iad1`     |      241 ms | 182–350 ms  |

- A dynamic page pays the Atlantic once (`fra1::iad1` in `x-vercel-id`): about 100 ms of the TTFB of a visitor in Germany before any database read. The 2.2 s outlier is a cold start
- The database latency inside the region (`iad1` to Neon in `us-east-2`) was not measured: it needs Neon's query statistics of the production branch, which is read only on the owner's explicit request (project CLAUDE.md). No pool change was made without numbers

## The move to Frankfurt (feature 24)

[ADR 0038](adr/0038-frankfurt-region.md) moves the functions from `iad1` to `fra1` and Neon from `us-east-2` to `eu-central-1`. Measured from Germany with curl against production: 31 requests a second apart, each on a new connection; the first is listed apart, because it can meet a cold function and a suspended database. Total time and not only TTFB, since the first byte of a prerendered page comes from the edge and the part a function renders follows it.

```bash
for i in $(seq 31); do
  curl -s -o /dev/null -D /tmp/headers -w "%{time_starttransfer} %{time_total} " "https://devstash.ievgenbilion.de$URL_PATH"
  grep -iE "^x-vercel-(cache|id)" /tmp/headers | tr -d '\r' | tr '\n' ' '; echo; sleep 1
done
```

| `URL_PATH`                                                | What it takes                                       | Before (2026-11-25): first | Median total | Min–max    | Median TTFB |
| --------------------------------------------------------- | --------------------------------------------------- | -------------------------: | -----------: | ---------- | ----------: |
| `/impressum`                                              | the edge in `fra1` (control)                        |                     158 ms |        92 ms | 78–212 ms  |       79 ms |
| `/api/auth/session`                                       | a function in `iad1`, no database read              |                    1766 ms |       187 ms | 171–259 ms |      186 ms |
| `/reset-password?email=probe%40example.com&token=unknown` | the shell from `fra1`, then a function and one read |                    3735 ms |       309 ms | 214–558 ms |       75 ms |
