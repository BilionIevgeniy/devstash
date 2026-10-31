# Current Feature

Audit hardening: security, performance and UI/UX fixes from the code audit of 2026-10-31

## Status

Implemented, waiting for the browser check

## Goals

Branch `fix/audit-hardening`. Each step lists what changes and where.

### Security

1. **Input limits on items (S1).** Constants in `items/domain/item-fields.ts`: `TITLE_MAX` 200, `DESCRIPTION_MAX` 2000, `CONTENT_MAX` 100 000, `LANGUAGE_MAX` 50, `URL_MAX` 2048, `TAGS_MAX` 20, `TAG_MAX` 50. `items/schemas.ts` composes them with `.max()` and user-facing messages. Tests in `items/schemas.test.ts`.
2. **Security headers (S2).** `next.config.ts` `headers()` for every route: `Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`, and `poweredByHeader: false`. A full script/style CSP (nonces, Monaco from jsDelivr, R2 img/connect) is deferred to `context/todo.md`.
3. **SVG never renders as a page (S3).** `files/domain/file-rules.ts`: `viewDisposition(fileName)` gives `attachment` for `.svg`, `inline` otherwise. `files/services/objects.ts` `signFileUrls` signs the view URL with it. An `<img>` still shows the SVG; opening the view link downloads it instead of running its scripts on the R2 origin. Test in `file-rules.test.ts`.
4. **Upload signing is rate limited (S4).** New policy `PRESIGN_BY_USER` (30 per hour) in `files/domain/file-rules.ts`. `files/services/presign-upload.ts` consumes it with `consumeRateLimit` (`lib/rate-limit`) after the Pro check and answers a refusal with a "Too many uploads" message (formatted by `getTooManyAttemptsMessage` from `auth/domain/rate-limits`, a lower rank). `presign-upload.test.ts` mocks `@/lib/rate-limit` and covers the refusal. Cleanup of uploads never attached to an item (R2 lifecycle) is deferred to `context/todo.md`.
5. **Item update keeps to the fields of its type (S5).** New pure `editableUpdate(typeName, input)` in `items/domain/item-fields.ts`: drops the fields the type does not have and returns an error when a URL type gets no URL. `items/services/item.ts` `updateUserItem` reads the item's type name (own model, scalar through its own relation, scoped by `userId`), applies it, then updates. Tests in `item-fields.test.ts` and `services/item.test.ts`. `ItemEditForm` makes the URL field required and disables Save while it is empty.
6. **Sign-in timing (S6).** `auth/nextauth/auth.ts` `authorize`: when the user is missing or has no password, compare against a fixed dummy bcrypt hash (cost 12, a constant in `auth/_internal/password.ts`) so both paths cost one bcrypt round.
7. **Per-email lockout cannot be triggered by strangers (S7).** `auth/domain/rate-limits.ts`: `LOGIN_BY_EMAIL` keyed by email + IP (5 per 15 min, the lockout a user sees) and a new `LOGIN_BY_EMAIL_GLOBAL` (50 per 15 min, a ceiling against distributed guessing). Pure `loginEmailKey(email, ip)` with a test. `auth.ts` consumes both and resets both on success; `actions/sign-in.ts` `getLockoutMessage` reads all three counters.
8. **Registration bounds (S8).** `auth/schemas.ts`: `name` `.max(NAME_MAX)` (100, in `auth/domain/registration.ts`). `app/api/auth/register/route.ts` answers 413 when `Content-Length` is over 10 KB. Tests in `auth/schemas.test.ts`.
9. **Dependencies (S9).** Move `shadcn` to `devDependencies` (used only by the CLI and by `globals.css` at build time) and run `npm audit fix` without `--force`.

### Performance

10. **Cards no longer carry the content (P1).** `ItemCardData.copyValue` becomes `canCopy: boolean` (computed on the server with `copyValueOf`; the content never reaches the RSC payload). New route `GET /api/items/[id]/copy` answers `{ value }` (session, `itemIdSchema`, one call to a new query `getItemCopyValue(userId, id)` in `items/queries.ts`). `CopyButton` accepts `value: string | (() => Promise<string>)`; for a function it writes through `navigator.clipboard.write([new ClipboardItem({ "text/plain": promise })])`, which keeps the user gesture in Safari, and falls back to `writeText` after the await. `ItemCardTrigger` passes a fetcher.
11. **Collections type ranking (P2).** Deferred to `context/todo.md`: counting item types per collection in the database needs a read of `Item` from `collections` (a foreign model) or a denormalized count, which is an architecture decision on its own.
12. **Composite indexes (P3).** `prisma/schema.prisma` Item: replace `@@index([userId])` with `@@index([userId, createdAt])`, add `@@index([userId, typeId, createdAt])`. Migration with `prisma migrate dev` (index-only, safe for the running deployment and a rollback).
13. **Orphan tags (P4).** `items/services/item.ts`: after an update replaces tags and after a delete, delete the user's tags that were linked to this item before and now have no items (`tag.deleteMany({ where: { userId, name: { in: removed }, items: { none: {} } } })`). Covered in `services/item.test.ts`.

### UI/UX

14. **Mobile sidebar closes on navigation (U1).** `app-shell/components/DashboardShell.tsx`: remember the pathname in state and close the drawer when it changes (adjusting state during render, no effect).
15. **Error and 404 pages (U2).** `src/app/(app)/error.tsx` (inside the shell: plain message, Try again via `retry`), `src/app/global-error.tsx` (own html/body, dark class), `src/app/not-found.tsx` (link to the dashboard). Reusable markup in `components/common/ErrorState.tsx` (no feature knowledge).
16. **Unsaved edits are not lost silently (U3).** `ItemEditForm` reports its dirty state through `onDirtyChange` (prop through `ItemDrawerContent` and `ItemDetailView`). The owners (`ItemDrawerProvider`, `ItemRouteDrawer` via its existing context, `ItemDetailView` for Cancel) ask in a new `items/_internal/components/DiscardChangesDialog.tsx` before closing the sheet or cancelling with changes. Esc, the overlay, the close button and Cancel all go through it.
17. **Sidebar state survives a reload (U5a).** `DashboardShell` gets `defaultSidebarOpen` from a `sidebar-open` cookie read in `src/app/(app)/layout.tsx` (already dynamic); the toggle writes the cookie.
18. **Signed-in users skip the auth forms (U5b).** `src/app/sign-in/page.tsx` and `src/app/register/page.tsx` call `auth()` and `redirect("/dashboard")` when signed in (in the page, not the proxy: the proxy cannot see a revoked session and would loop).
19. **Consistent pending labels (U5c).** `Creating…`, `Saving…` with the ellipsis character, like `Deleting…`.

### Not in scope

Sidebar links to `/collections` (pages come with the collections specs in `featuresDRAFT`), pagination, Free limits, search, favorites/pinned toggles: all planned in `featuresDRAFT`.

### Docs

`context/todo.md` (deferred: strict CSP, R2 orphan lifecycle, collections ranking), `docs/architecture.md` known risks and `docs/modules.md` (new route, `PRESIGN_BY_USER`) where they change.

## Notes

- Checks before handing over: `npx tsc --noEmit`, `npm run lint`, `npm run test`, `npm run build`. The browser check is the user's.

### Changed after the review (architecture-reviewer and code-reviewer, 2026-10-31)

- 2: HSTS without `includeSubDomains`, production only.
- 3: decided by the object key (`viewDisposition(key)`), not the display name.
- 4: counted after `checkDeclaredFile`; the refusal uses the shared "Too many attempts…" wording; fails closed.
- 5: only an explicit `null` URL is refused (left out = unchanged); one read gives the type and "Item not found".
- 6: `verifyPassword(password, hash | null)` in `auth/_internal/password.ts`; test pins the dummy hash's cost. Also used by `verifyPasswordByEmail`.
- 7: goal restated: the lockout is per email + IP (`login:email-ip`, 5), the per-email ceiling (`login:email-global`, 50) is never reset by a success and can still be used up by several addresses (known risk).
- 8: no 413 check (chunked bodies bypass it); `name` max 100 and `emailSchema` max 254.
- 10: no new route or query: client `items/_internal/components/ItemCopyButton` reads `GET /api/items/[id]` (now `Cache-Control: private, no-store`) and applies `copyValueOf`; `CopyButton` gets a separate `getValue` prop, a Blob `ClipboardItem`, one request reused by the fallback, and a pending state.
- 12: `@@index([typeId])` kept.
- 13: `tag.deleteMany({ where: { userId, items: { none: {} } } })`, best effort after the write; the race is a known risk.
- 14: also closes on any link click in the drawer (same-path links).
- 15: also `src/app/error.tsx` for the layout; `global-error` imports `globals.css` and sets `dark`.
- 16: Cancel asks inside `ItemEditForm`; owners keep the dirty flag in a ref fed by an effect with a cleanup; `beforeunload` while dirty; Back on the route drawer and links on the full page are documented as not covered.
- 17: cookie name and parsing in `app-shell/domain/sidebar.ts` with a test.
- 9: `npm audit fix` moved the Prisma CLI to 7.10.1; `@prisma/client` and `@prisma/adapter-pg` aligned to 7.10.1. `next`, `next-auth`, `react` unchanged.

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
