# Current Feature

Session-aware homepage header

## Status

In Progress

## Goals

- The auth pages get a way back to the homepage: a "Back to home" link above the card, and the logo in `AuthCard` becomes a link. They stay a focused card, with no nav and no footer
- Signing out from the sidebar and deleting the account lead to the homepage. After a password change the user still goes to `/sign-in`, to sign in with the new password
- After a password reset or an email verification, Back does not lead to the used link (`router.replace`), and after an account deletion not to its settings (`redirect` with `RedirectType.replace`, since `signOut`'s own redirect is a push in a Server Action)
- A signed-in user keeps access to the homepage (no redirect from `/`)
- For a signed-in user the homepage header shows one Dashboard button instead of Sign In and Get Started, and the mobile panel drops Sign In
- The homepage stays statically prerendered: the session is checked in the browser after mount, and the guest header is the default

## Notes

- `Logo` moves from `app/(marketing)/_components/` to `src/components/common/`, because a feature cannot import `app/`
- New in `auth`: public `components/hooks/use-has-session.ts`, which aborts on unmount, and private `_internal/components/fetch-has-session.ts` (`client-only`), since only the hook calls it. Both are in `docs/modules.md`
- A failed session check, a 500 included (`response.ok && Boolean(body?.user)`), leaves the guest header. A stale header is harmless: `/sign-in` and `/register` already redirect a signed-in user
- UI rules: `Navbar` keeps one primary `Button` that changes its `href` and label, so focus is kept, and only Sign In is conditional. "No layout shift" is accepted with a known limit: a signed-in user sees the guest buttons swap after mount, inside the fixed header, so the page content does not move
- `/api/auth/session` clears a revoked cookie and renews a valid one on each homepage visit
- `/forgot-password`, `/reset-password` and `/verify-email` stay reachable when signed in: an email link may belong to another account
- No `auth()` on `/`, no change to the `src/proxy.ts` matcher, no `cacheComponents`, no `SessionProvider`, no `(auth)` route group
- `context/todo.md`: the "homepage ignores the session" item is narrowed to the calls to action in `HeroSection`, `CTASection` and `PricingCard`, which keep linking to `/register`
- The comment in `sign-in/page.tsx` and `register/page.tsx` now says a revoked session reads as signed out: `auth()` in a server component cannot clear the cookie
- Out of scope, for a separate `fix/` branch: `callbackUrl` set by the proxy is ignored after sign-in

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
