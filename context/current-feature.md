# Current Feature

Sign-in callback URL

## Status

In Progress

## Goals

- After sign-in, by password or GitHub, the user lands on the page the proxy sent them away from, not always on `/dashboard`
- A signed-in user opening `/sign-in?callbackUrl=...` goes to that page too
- Only an internal path is ever followed: `//evil.com`, `/\evil.com` and absolute URLs fall back to `/dashboard`, and the check runs on the server for every sign-in, since a form field can be forged
- The 404 and root error pages link to the homepage instead of `/dashboard`, so a guest is not sent to sign-in

## Notes

- The proxy sets `callbackUrl` today, as a full `href`, and nothing reads it
- The rule goes in `auth/domain/` with its tests; `callbackPathSchema` in `schemas.ts` applies it in both sign-in actions
- Only printable ASCII is allowed, with no backslash: the proxy's value is already percent-encoded, and a character above U+00FF would make the redirect header throw
- Accepted limit: Auth.js sends a failed GitHub sign-in to `/sign-in?error=...` with no `callbackUrl`, so a sign-in after that lands on `/dashboard`. Not worth a cookie

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
