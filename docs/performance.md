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

### No real-user Web Vitals

DevStash does not report Web Vitals from visitors' browsers (no `useReportWebVitals`, no Vercel Speed Insights). Reading performance data on a visitor's device may need consent under §25 TDDDG, and there is no consent banner. Decided 2026-11-14; revisit with a consent decision (`context/todo.md`, "Observability").

## Feature 13 (2026-11-14)

### Client JavaScript per route (compressed, kB)

| Route | Baseline | After the dialog split | Change |
| ----- | -------: | ---------------------: | -----: |
| `/`, `/de` | 359.6 | 359.7 | 0 |
| `/impressum` | 344.2 | 344.3 | 0 |
| `/sign-in` | 342.8 | 342.8 | 0 |
| `/dashboard` | 499.9 | 437.7 | −62.2 |
| `/items/[type]` | 502.7 | 440.7 | −62.0 |
| `/collections/[id]` | 503.6 | 441.3 | −62.3 |
| `/favorites` | 540.9 | 479.2 | −61.7 |
| `/settings` | 537.3 | 485.2 | −52.1 |
| Shared by app routes | 481.9 | 428.1 | **−53.8 (−11%)** |

The largest parts of the shared app JavaScript after the split: Next.js and React (about 216 kB), the Sentry browser SDK (about 41 kB), the global CSS module (18 kB), TanStack Query (12 kB).

### The create dialog

- `CreateItemDialog` imported its whole form statically, and the top bar renders it on every app page: the fields, the editors' wrappers, the upload field, the collection select and the AI buttons shipped with every page. The form (`items/_internal/components/CreateItemForm.tsx`) is now its own chunk, loaded with `import()`: once the page is idle, on hover or focus of the button, or when the dialog opens. A plain `import()` and not `next/dynamic`, which is `React.lazy`: lazy suspends on its first render even when the chunk is already loaded, which would flash the skeleton, and it throws a failed chunk to the page's error boundary. A failed load shows its error with Try again inside the dialog
- The chunk is still downloaded on every app page, after hydration at idle time, so it no longer delays the first load
- With the chunk loaded (the normal case), the time from the click to an editable Title field was 46 to 99 ms over five opens on `/dashboard` (target: under 200 ms)
- The collection create and edit dialogs were left whole: the part that could move (`CollectionFields` and the form) is under 1 kB each, and the dialog shell would stay

### Lab results

| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| ---- | ----------: | ------------: | -------------: | --: | --: | --: | --: |
| `/` | 100 | 100 | 100 | 100 | 1.2 s | 0 | 60 ms |
| `/de` | 100 | 100 | 100 | 100 | 1.2 s | 0 | 20 ms |

Layout shift on `/dashboard`, `/items/snippets`, `/items/images` and `/favorites` after load: 0.0013 each (good is below 0.1). The item images need no change: `ImageCard` draws its image in an `aspect-video` frame and the drawer in a fixed-height frame (`FILE_PREVIEW_HEIGHT`), so an image that arrives cannot move anything. The end-to-end user has no uploads (R2 is a dummy there), so no real image was loaded in this measurement; the frames hold by their CSS.

### Sidebar navigation

Each sidebar link carries `LinkPendingMark` and dims while its navigation is pending, after a 100 ms delay so a prefetched or fast navigation does not flicker. Every app segment has its own `loading.tsx` except `/profile` (`context/todo.md`).
