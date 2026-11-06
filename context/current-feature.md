# Current Feature: Free Plan Gating and Demo at the Limit

## Status

In Progress

## Goals

- A Free user who types the URL of a Pro page is redirected to `/settings` with a notification to subscribe, and does not see the page. This holds also for a user who keeps files from a cancelled subscription
- In the sidebar a Free user sees Files and Images with their counts, but the rows are disabled: they open only with a subscription
- A Free user cannot go over 50 items or 3 collections, and cannot create files or images, also when calling the server directly
- On the `development` branch only the demo user is left, on the Free plan, with no data that breaks the Free terms
- The seed leaves the demo user just under the limits (49 items, 2 collections), so the limits can be tested by hand

## Notes

Plan reviewed by the architecture reviewer. This is the first of two features: the second is under "Next feature" below. State of the checks after this feature (2026-11-06):

| Check | State |
| ----- | ----- |
| Item limit | Protected on the server: `createUserItem`, count under an advisory lock |
| Collection limit | Protected on the server: `createUserCollection`, count under an advisory lock |
| Create a file or image item | Protected on the server: `confirmFileColumns` refuses a Free user |
| Upload URL | Protected on the server: `presignUpload` refuses a Free user |
| Edit | Protected: no type or file field in `updateItemSchema`, pinned by a test |
| `/items/files`, `/items/images` | Protected: the page redirects a Free user through `userCanUseType` |
| `/items/files/[id]`, `/items/images/[id]` | Protected: the page redirects a Free user through `userCanUseType` |

File and image are the only Pro pages today: custom types, AI and export have no routes yet.

Implementation order, each step confirmed separately:

1. Pro pages: one rule in `items/domain/item-fields.ts` that takes a plain `string`, with its test; `canCreateType` delegates to it. The list page and the detail page redirect a Free user before any listing is read, and only for Pro types, so other pages gain no read. The check lives in the page, not in `proxy.ts`: limits read `getEntitlements`, never the JWT, and the proxy has no database. The `/settings` path and its param are one constant in `billing/domain`. `BillingPanel` reads the param with the same array and empty handling as `session_id`. A new hook in `billing/_internal/components/hooks/` shows the toast with a fixed id, only when `!isPro`, and always clears the param with `window.history.replaceState`, not `router.replace`. `Sidebar` reads `getEntitlements` once; `TypesSection` draws a Pro type for a Free user as a non-link with `aria-disabled`, no hover style, its PRO badge and count. The `items` entry of `docs/modules.md` gets the new export
2. One test: `updateItemSchema` drops `fileKey`, `typeId` and `userId`. The other existing server gates already have tests
3. A shared exact-match host check under `scripts/`, used by `delete-users.ts` and `reset-demo.ts`. Then `npm run db:delete-users` on `development`: removes `bilionjenia1111@gmail.com` (no data, no subscription)
4. `scripts/reset-demo.ts` (`db:reset-demo`), run with `tsx --conditions=react-server` so it can import `lib/r2`. It refuses any host but the `development` endpoint and refuses a demo user with a `stripeCustomerId`. It reads the keys from `Item.fileKey`, keeps the `users/<id>/` prefix check, prints them and deletes them by exact key, then removes the items, collections, tags and `Subscription` row. The user and its password stay. Reset plus seed brings back the start after a limit test
5. Seed: drop `seedDemoSubscription`. 2 collections (`Pagination Test`, `React Patterns`) with every `collectionNames` rewritten and at least one item in both (`db:test` needs it). 49 text items: 12 demo, 18 snippet and 19 command samples, so both type pages keep a second page. No file or image items, since they need Pro. Run reset and seed, check the counts with SQL. Update `docs/modules.md`, `docs/stripe-integration-plan.md`, the comment in `seed-pagination-data.ts` and `context/todo.md`

Constraints:

- The demo `Subscription` row is `active` with no Stripe ids: it was granted by the seed and by migration `demo_user_pro`, so it is treated as no subscription
- A user who went from Pro to Free keeps their file items and sees their count, but the list and detail pages stay closed until they subscribe, also for an item they own
- Known gap until the next feature merges: a Free user's existing file items still open from the dashboard, collections and search, and `/api/items/[id]` still answers. Tolerable with no real users, and the production demo user stays Pro
- No migration deletes files: a migration cannot reach R2 and would also run on production. The dev data goes through `reset-demo.ts`
- `/items/[type]` has a `loading.tsx`, so the redirect may reach the browser through the stream and not as an HTTP 307. It still happens before any content
- Only the `development` branch of Neon is touched. The production demo user stays Pro: the build runs migrations, not the seed
- The R2 keys hold the dev demo user's id, and `development` was branched before any upload, so production rows do not point at them. The objects cannot be restored; the dev database can, through Neon
- After the seed the real-world demo content of migration `demo_items_content` is replaced by the placeholders of `seed-data.ts` (known gap in `context/todo.md`), and collection pagination cannot be checked with 2 collections

## Next feature: Locked Pro Items

Its own branch and its own plan review, right after this one. Decided so far:

- File and image items of a Free user are locked wherever they show: dimmed, with "Renew your subscription to open" over the middle of a card, and they do not open
- A "Locked files" section on `/settings`: a paginated list with title, file name, size, Download and Delete, and no preview, drawer or editing. It is the one place a Free user can reach these files, so they are not held hostage to a payment and can free the item limit. Locked cards link to it
- Server: a service such as `openUserItem` decides from the record's real type before signing, used by `/api/items/[id]` and the `@drawer` route. `getUserCollectionListing` reads `getEntitlements` itself and signs no URLs for a Free user. `updateUserItem` refuses a Pro type for a Free user. Favorite and pin are hidden in the UI only: they expose no file
- UI: two shapes in `_internal/components/LockedItem*`, a card and a row, with opacity on the content only. The trigger renders no `role="button"` when locked. Deleting waits for the server, the dialog stays open on failure, and focus goes to the provider's sentinel
- Search: the lock goes in the search index. `isPro` on `ItemDrawerProvider` is optional, for the dashboard, favorites, pinned and collection pages; the dashboard page turns async and gets a `loading.tsx`
- Fixture: the seed leaves no file items, so testing needs one on `development`: grant a test user a `Subscription` row, upload a file and an image, remove the row
- Accepted: URLs signed before a cancellation stay valid for up to 2 hours; a tab left open across a cancellation fails on click; a Free user keeps download access with no expiry, so a retention policy waits for real numbers

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
