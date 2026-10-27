# Current Feature: Inline Lockout Errors and GitHub Re-authorization

## Status

In Progress

## Goals

- Show every rate-limit refusal as an inline red error in the form, not as a toast ("Too many attempts. Please try again in N minutes."): sign-in, register, forgot password, confirm email, change password and the delete-account dialog
- Give the email-send IP limit (forgot password, resend verification) the same minutes in its message instead of "Try again later."
- After a GitHub sign-in, revoke the app's authorization on GitHub, so the next sign-in with GitHub (after a sign-out, or after the account was deleted) starts with GitHub's authorization screen
- When an account is deleted, remove everything about it: the user's rows (they already go with the user) and the GitHub authorization (revoked before the deletion), so signing in with GitHub again asks for authorization and starts a fresh account
- A failure of the GitHub call is logged and never blocks a sign-in or a deletion

## Notes

- Inline errors: `SignInForm`, `ForgotPasswordForm`, `RegisterForm`, `ConfirmEmailForm` and `ChangePasswordForm` already render their error in a red `role="alert"` paragraph; in each, remove the toast branch and the hiding of the inline text for rate-limit messages, and drop `isTooManyAttemptsMessage` if nothing uses it afterwards. `DeleteAccountDialog` toasts every error today, so it gets an inline red line for its lockout. `ResendVerificationButton` is a button without an error area and keeps its toast (to confirm)
- Minutes for the email-send IP limit: `EmailSendCheck` is a string union, so `ip-limited` has no `reset`; make the check return an object that carries the IP counter's `reset`, and update its callers (`registration.ts`, `password-reset.ts` and the resend action). The static "Try again later." stays only as the sign-in fallback for when the counters cannot be read
- GitHub skips its authorization screen while the app holds a grant for the user. The app owner can remove the grant with `DELETE /applications/{client_id}/grant`, using Basic auth with `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` and the user's `access_token` in the body; confirm the exact request on GitHub's REST page before coding
- Revoke right after each GitHub sign-in (an `events.signIn` handler in `features/auth/auth.ts`, which receives the fresh `account.access_token`) and not at sign-out: Auth.js does not refresh the token stored in `Account` on later sign-ins, so a sign-out would not hold a valid token. This also covers an expired session and other devices; every GitHub sign-in then starts with GitHub's screen. The first GitHub sign-in after the deploy is still silent for a user who holds a grant, because the revoke runs after that sign-in
- Deleting an account: `deleteUserAccount` (`features/auth/account.ts`) already removes the `Account` rows with the user (onDelete: Cascade). Before its transaction, also try to revoke the grant with the stored GitHub token (best effort, a stale token just fails), so the next GitHub sign-in asks for authorization and creates a new account
- New server-only helper `features/auth/_internal/github-grant.ts` (only `auth.ts` and `account.ts` of the same feature use it); the request has a timeout, and any failure is logged and leaves that one sign-in silent instead of failing it
- GitHub's wording for a returning user may be "Reauthorize" where a first-time user sees "Authorize" (the course author's flow shows both); either is what is wanted: a GitHub-side screen on every GitHub sign-in
- It is a click, not a password: GitHub's OAuth cannot ask for the password again, so someone at a browser with an open GitHub session can still click Authorize; signing out of GitHub stays the real protection. Revoking also makes the tokens stored in `Account` useless, which closes the deferred "OAuth tokens stored in plaintext" item
- Production: `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are already set in Vercel Production; no new variable and no migration, and a push to `main` deploys
- Checks: tsc, lint and `npm run build` (passes locally since IPv6 was turned off). Browser (by the user): sign in with GitHub, sign out, sign in again and expect GitHub's authorization screen; delete a throwaway GitHub-only account, sign in with GitHub again and expect the screen and an empty new account; six wrong passwords show the inline red error. Use a second GitHub account for the deletion test, not the main one
- Out of scope: a stronger confirmation for deleting GitHub-only accounts (email link), `prompt=select_account`, dropping the `RateLimit` table

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
