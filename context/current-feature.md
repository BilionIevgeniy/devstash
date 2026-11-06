# Current Feature: Locked Pro Items

## Status

In Progress

## Goals

- A page `/upgrade` that looks like the homepage pricing, centered: the Monthly/Yearly switch, a Free card with a disabled "Current plan" button and a highlighted Pro card with one "Upgrade to Pro" button that starts Checkout for the chosen period. Below them, centered, the demo payment hint while Stripe runs on a test key. It works from a phone width up, with the same order as the homepage: Free, switch, Pro. A Pro user who opens it is redirected to `/settings`
- A Free user on `/items/files`, `/items/images` or their detail pages is redirected to `/upgrade`. This replaces the redirect to `/settings` built in the previous feature
- An "Upgrade" button in the top bar for a Free user only: icon and text from `sm` up, icon only on a phone, and an "Upgrade to Pro" row at the bottom of the sidebar drawer
- File and image items of a Free user are locked wherever they show (dashboard, collections, favorites, pinned, search, sidebar): dimmed, with "Renew your subscription to open" over the middle of a card, and they do not open. They lead to `/upgrade`
- `/settings/locked-files`: a paginated list with title, file name, size, Download and Delete, and no preview, drawer or editing. `/settings` and `/upgrade` show one row with the count and a link when there are such files
- The server refuses what the UI hides: no signed URLs reach a Free user anywhere but this list
- A plan badge beside the DevStash logo in the sidebar and on the Plan row of the billing section in `/settings`: a muted "Free", or a "Pro" on the blue gradient of the homepage's "Most Popular" badge
- On a phone the Monthly/Yearly switch of the homepage pricing sits above the Pro card, not above the Free card. On a wide screen it stays above both

## Notes

Background: `context/features/locked-pro-items-spec.md`. Where it differs from this file, this file wins. Starts from `main` after `feature/stripe-demo-hint` is merged: that feature adds `testMode` to `BillingActions`.

Modules (`docs/modules.md`): the item work is in `items`, the upgrade content and the plan badge in `billing` (it owns the billing UI), the search lock in `search`, the top bar and sidebar in `app-shell`, the switch in `app/(marketing)`. Pages compose through `app/`, since `billing` has a lower rank and cannot import `items`.

Implementation order, each step confirmed separately:

1. `/upgrade`. Route `app/(app)/upgrade/` with `page.tsx` and `loading.tsx`; add `/upgrade/:path*` to the matcher in `src/proxy.ts`. `billing/components/ProUpgradePanel.tsx` stays a server component; the checkout buttons move from `BillingActions` to one `_internal` component with `"use client"`, used by both. The demo hint moves with them, so it shows on `/upgrade` too. The list of what Pro gives today goes to one constant in `billing/domain/limits.ts`, which `PricingSection` imports and extends with its roadmap lines; the page shows only what works now. `items/[type]/page.tsx` and `[id]/page.tsx` redirect a Free user to `/upgrade` before any read. Removed as unused: `billing/domain/upgrade-redirect.ts`, `use-upgrade-notice.ts`, the `upgrade` param in `BillingPanel` and `BillingSection`, `DISABLED_ROW_CLASS`, and the `isPro` prop of `TypesSection`, whose rows go back to links with the PRO badge
2. Upgrade button. `app/(app)/_components/UpgradeButton.tsx` streams into the top bar through a slot, like `NewItemButton`, so the shell does not wait for the plan; a Pro user gets nothing. Gradient through the global `gradient-fill` utility. The fallback holds no space, since a Pro user has no button. `Sidebar.tsx` draws the "Upgrade to Pro" row at the bottom, shown only in the drawer on a phone
3. Server gates. `openUserItem` in `items/services/item-detail.ts` (not a new file, so the signer stays private): `getItemDetail`, then `userCanUseType` on the record's real type, then signing; it returns `ok`, `locked` or `missing`. `/api/items/[id]` answers 403 on `locked`, the `@drawer` route redirects to `/upgrade`. `getUserCollectionListing` reads `getEntitlements` itself and signs nothing for a Free user. `updateUserItem` refuses a Pro type for a Free user
4. Locked files. A paginated read in `items/_internal/queries.ts` on `{ userId, fileKey: { not: null } }`, newest first. `items/services/locked-files.ts`: `getUserLockedFiles` and `getUserLockedFileCount` read `getEntitlements` themselves, the count is 0 for Pro, and the list signs Download only and returns a `LockedFile` DTO with no `viewUrl`. Route `app/(app)/settings/locked-files/` with `page.tsx`, `loading.tsx`, `?page=`, `PaginationNav` and `<Suspense key={page}>`. A Pro user is redirected to `/settings`. An empty list has its own message. The header has a Renew link to `/upgrade` and a back link to `/settings`. Public `items/components/LockedFileList.tsx` with a private row in `_internal`, using no `useItemDrawer`
5. Locked UI. `items/_internal/components/LockedItemCard.tsx` and `LockedItemRow.tsx`, opacity on the content only. `ItemDrawerTrigger` is the client boundary: when locked it renders no `role="button"` and no `action`. `ItemCardTrigger` and `ImageGallery` stay as they are: they render on the server. Only `FileRow` and `ItemRowActions` change, since their controls are siblings of the trigger. On `/favorites` and `/pinned` the control that takes the row off its list stays beside delete
6. Delete. One hook in `items/_internal/components/hooks/` for the card, the rows and the locked files list, following `DeleteCollectionDialog`, not `ItemDetailPage`: a `deletedRef`, `onCloseAutoFocus` does nothing unless it is set so Cancel and Esc return focus to the trigger, the toast fires there, `unstable_rethrow` in the `catch`. The focus target is a parameter: the card and rows read the sentinel from the context, the list passes its own. `DeleteItemDialog` gets a label with the title
7. Wiring. Prop `lockProItems` on `ItemDrawerProvider` for the dashboard, favorites, pinned and collection pages, and one `isLocked(item)` in the context, built on `canUseType`. `DashboardPage` turns async with a new `dashboard/loading.tsx`. `getSearchIndex` adds the lock to the index; `PaletteResults` on a locked item calls `onClose()` and `router.push("/upgrade")`, with no `onDrawerOpen()`. `Sidebar.tsx` passes `isPro` to `ItemsSection`; a locked `SidebarItemLink` bypasses `itemPagePath` and links to `/upgrade`, dimmed. Locked rows get an accessible name with the reason
8. Plan badge. `billing/components/PlanBadge.tsx`, one component for both places, with `gradient-fill` for Pro and `variant="secondary"` for Free. `Sidebar.tsx` draws it beside the logo from the `isPro` it already reads, `BillingSection` on the Plan row in place of the current `Badge`. `SidebarSkeleton` gets a matching `Skeleton`
9. Pricing switch. In `PricingSection` the DOM order stays switch, Free, Pro, so the tab order holds on a wide screen. The switch moves into the grid with `md:col-span-2` and `md:mb-4` in place of `mb-10`, so the 40px gap stays; the Free wrapper gets `max-md:order-first`
10. Check by hand and docs. A test user on `development` with a `Subscription` row uploads a file and an image, the row is removed, and after the check the items and then the user are deleted. Rewrite the `billing` and `app-shell` entries of `docs/modules.md`

11. Redesign of `/upgrade`, replacing the single card of `ProUpgradePanel`. `PricingCard`, `BillingToggle`, `CheckList` and `GradientBadge` move from `app/(marketing)/_components/` to `billing/components/`, since `billing` cannot import `app/`, and the homepage imports them from there with no visible change. `PricingCard` takes its action as a `ReactNode` slot instead of building the link: the homepage passes the `/register` link, `/upgrade` a disabled "Current plan" button and the "Upgrade to Pro" button. A client component in `billing` holds the period state and renders the switch, the two cards and the hint; the Checkout start reuses `useBillingRedirect`. The Pro card lists only `PRO_PLAN_FEATURES`. `CheckoutButtons` with its two buttons stays on `/settings`. `upgrade/loading.tsx` mirrors the new layout

Tests: `openUserItem` makes no signing call on `locked`; the update refuses a Pro type; a collection listing gives a Free user no URLs and a Pro user URLs; delete works for a Free user; `getUserLockedFiles` has no `viewUrl` and returns nothing for Pro; the count is 0 for Pro and positive for Free; the where clause of the new read leaves out other users and items with no file; `getSearchIndex` locks file items for Free and none for Pro; the 403 case in `route.test.ts`. The existing test mocks need billing for these reads.

Constraints:

- Accepted: after a delete on `/favorites` and `/pinned` focus lands at the top of the list, since focus was in the dialog's portal
- Accepted: `cancel_url` stays `/settings`, so cancelling Checkout started on `/upgrade` lands there; `useCheckoutReturn` lives on that page. Back from Stripe may leave `isPending` stuck on the buttons: fix it with a `pageshow` handler only if it shows
- Accepted: the homepage pricing keeps its roadmap lines (custom types, AI, export); `/upgrade` shows only what works today
- Accepted: the top bar's Upgrade button stays live while a payment is being confirmed, so a late webhook allows a second Checkout. Recorded in `docs/architecture.md`, and to be checked before live mode
- Accepted: a stale tab opening a locked item through the drawer route leaves with no exit animation

As built, differing from the steps above: `upgrade-redirect.ts` became `billing/domain/upgrade.ts` with `UPGRADE_PATH`; `TypesSection` keeps `isPro` and links a Pro type straight to `/upgrade`; delete is one component, `DeleteLockedItemButton`, not a hook, and it shares `DeleteItemConfirm` with `DeleteItemDialog`; `PinnedGroupSkeleton` was split off so `pinned/loading.tsx` no longer imports `PinnedGroup`, which holds client code. The reviewer saw these. The check by hand with a test user is left to the user.

- Accepted: the trade-offs at the end of the spec
- A file or image item always has a `fileKey`: the create service refuses one without it, so the list query needs no type filter
- A detail page never shows a locked item, also one the user owns
- Only the `development` branch of Neon is touched

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
