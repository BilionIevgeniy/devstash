# 0037. Caching strategy: Cache Components, nothing per user cached

- Status: accepted
- Date: 2026-11-19

## Context

Until feature 22 nothing was cached on the server: `src/app/(app)/layout.tsx` set `export const dynamic = "force-dynamic"` (redundant, the session cookie already made the routes dynamic), and every mutation ends with `refresh()`. Next.js 16.4 recommends Cache Components, with Partial Prefetching, for every app and makes both the default in Next.js 17; `force-dynamic` is not allowed with them. The spec proposed caching the system item types, the entitlements per user with a tag, the marketing page and the legal pages, with an invalidation matrix per Server Action.

What was found while building it:

- **The default `use cache` store is an in-memory LRU per instance** (`node_modules/next/dist/server/lib/cache-handlers/default.js`). On serverless, entries "typically don't persist across requests" (the `use cache` and `use cache: remote` docs), and an `updateTag` on one instance clears that instance only, as far as the docs and the platform docs say. A stale plan is an authorization read: a cancelled Pro user could keep Pro on another instance.
- **The candidate reads save no round trip.** `getEntitlements` is one lookup by primary key; the system types are read in the same query as the user's own types and their counts (`getSidebarItemTypes`).
- **Every app and auth route reads the request at the top of its layout**: the locale (a cookie, ADR 0024) and the sidebar cookie. A static shell could only be text-free, and it cannot know whether the sidebar is collapsed, so the page would shift when the shell came.
- **Partial Prefetching made each page view about twice the database queries** (lab, `docs/performance.md`): every route reads the session, so each visible link's App Shell prefetch is a server render with its reads, for the same TTFB and LCP.

## Decision

**Cache Components on, Partial Prefetching off, nothing per user cached on the server.**

- `cacheComponents: true`; `force-dynamic` removed. `partialPrefetching: false`, which Next.js accepts with a warning
- **Static, and enforced**: `/`, `/de`, `/impressum`, `/datenschutz` and `/agb` export `ensureStatic = "navigation"`, so the build fails if a change makes them read the request. The footer's copyright year is read in a `"use cache"` helper with `cacheLife("days")`, so those pages regenerate once a day in the background (the build shows `○` with Revalidate `1d`)
- **Blocking, and said so**: `(app)/layout.tsx` and `(auth)/layout.tsx` export `instant = false`. The routes below them render per request as before; params routes show `◐` with an empty fallback shell
- **§ 312k (`/vertraege-kuendigen`)** reads the session under `<Suspense>` behind a skeleton of its signed-out form, so its title and lead are the static shell. Its links never prefetch (`prefetch={false}`): Chromium kept a prefetch of its route tree open after the last byte on every page, and a page few visit gains nothing from it
- **Nothing per user is cached on the server**: no `use cache` around a read of a user's rows, and the entitlements stay a read per request (`React.cache` dedupes it within one)

### The invalidation matrix

| Writer                                                        | Cached data it changes | Call                                    |
| ------------------------------------------------------------- | ---------------------- | --------------------------------------- |
| Every Server Action of items, collections, custom types       | none                   | `refresh()` (unchanged)                 |
| The locale switch (`app-shell/actions/locale.ts`)             | none                   | `refresh()` (unchanged)                 |
| Checkout and cancellation actions                             | none                   | `refresh()` (unchanged)                 |
| The Stripe webhook, the daily reconciliation (Route Handlers) | none                   | nothing: the next request reads the row |
| A deploy                                                      | the footer year        | the build prerenders it again           |
| Consent                                                       | none: browser state    | never on the server (ADR 0034)          |

### The rules for the day something per user is cached

The trigger: a read the measurements show as hot, and a shared cache whose tag invalidation reaches every instance (verified, or `use cache: remote`). Then: the cached function takes `userId` (and the locale) as arguments and is never exported on its own, so a caller cannot ask for another user's id; it never calls `getSessionUser`, `auth()` or `cookies()`; its tag is `<model>:<userId>`, never an email; a Server Action invalidates with `updateTag`, a Route Handler (the webhook, the cron) with `revalidateTag(tag, "max")`, and `refresh()` stays where no cached data changed. An integration test proves two users get different entries.

### What a route kept mounted means

Cache Components keeps a route the user left mounted but hidden (React's `<Activity>`), and brings its state back with it; effects are cleaned up while hidden and run again. Found and fixed with `useRemountOnReveal` (`components/common/hooks/`), which changes a key when the route is hidden so the part mounts anew:

- the item page's Monaco editor: its cleanup disposes the editor, which then threw on return
- the route drawer: on Forward its page stayed hidden inside the sheet's portal, an empty sheet over a page it had made `aria-hidden`
- every form with a password (sign-in, register, reset, confirm email, change password, delete account): a password typed and left waited in the page

The dialogs and dropdowns of the shared layout were not affected: the layout is never hidden. `useUnsavedChanges` and the other listeners subscribe in effects, so they detach while hidden and come back with the route. `e2e/activity.spec.ts` pins each case.

The key also changes whenever React disconnects the layout effects for another reason: a Suspense boundary above that shows its fallback again because something suspended outside a transition, and in development StrictMode's simulated unmount and Fast Refresh. So no suspend outside a transition may sit above a part that takes the key (navigations, `refresh()` and `useActionState` all run in transitions); in development each such part mounts twice.

### Ending a session leaves the document

A route kept mounted outlives the session it was rendered for. A sign-out, a password change and a deleted account were Server Action redirects, soft navigations, so Back showed the last user's pages (found by the auth audit, pinned by `e2e/sign-out.spec.ts`). They now end the session with `signOut({ redirect: false })`, and the browser loads the next page as a new document with `location.replace` (`leaveSession`, `features/auth/components/leave-session.ts`), which drops every hidden route and the history entry. The cookie deletion re-renders the current page, which may redirect to sign-in on its own; the callers leave on that redirect error too, never following it as a soft navigation. The app shell also reloads a page the browser restores from its own back-forward cache (`useReloadOnRestore`, `pageshow` with `persisted`), which Playwright's Chromium never does, so that case has no end-to-end test. `/switch-account` keeps its redirect: it is reached only by a document load.

A session that ends on the server (expiry, or the sessions a password change on another device revoked) reaches `/sign-in` through `getSessionUser`'s soft redirect: the auth layout's `FreshAuthDocument` loads that page again as a new document when the app shell was shown in the same one (`app-shell-document.ts`), pinned by "a session revoked on another device" in `e2e/sign-out.spec.ts`. Every error path of the three endings leaves as well: a lost answer may hide a session that already ended.

### Errors and tests

- With Partial Prefetching on, Next.js 16.4 called `onRequestError` twice for one error of a Server Component, with two digests (the page shows the first). With it off there is one call, so no guard drops a report: one would hide a real second failure of the same URL. When Partial Prefetching is turned on, `e2e/egress.spec.ts` ("one event per error") fails on the twin, and the guard comes with that change
- Chromium reports some prefetches as unfinished after their last byte, so `networkidle` may never come. The end-to-end tests wait for the answers instead (`waitForAnswers`, `e2e/support/network.ts`): the session cookie comes with the headers

## Consequences

- No user can see another user's data from a server cache, since there is none; `e2e/two-users.spec.ts` guards the browser side (one tab, a Pro user then a Free user, Back included)
- Every app page still renders per request: TTFB is the server's render plus the database. Production runs its functions in `iad1` against Neon in `us-east-2`; a visitor in Germany pays the Atlantic once for a dynamic page (`docs/performance.md`)
- Revisit Partial Prefetching with Next.js 17, or once the app layout no longer reads the request (the locale in the URL instead of a cookie would allow a static shell with words)
- `next build` prints a warning for `partialPrefetching: false`; it is deliberate

## Addendum (2026-11-25)

The regions named here (`iad1`, `us-east-2`) are the ones before [ADR 0038](0038-frankfurt-region.md), which moved the functions and Neon to Frankfurt.
