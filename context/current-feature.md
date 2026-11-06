# Current Feature: GitHub Sign-in, the Usual OAuth Flow

## Status

In Progress

## Goals

- GitHub sign-in behaves as in a usual SaaS product: GitHub's authorize screen on the first sign-in, no screen on a repeat sign-in by a user already signed in to GitHub, GitHub's own sign-in form for a user who is not
- No GitHub token is stored in new `Account` rows
- The GitHub sign-in that confirms an account deletion shows GitHub's account picker, and it cannot attach a different GitHub account to the signed-in user

## Notes

Plan reviewed by the architecture reviewer. What changes:

1. `auth/nextauth/auth.ts`: no grant revoke after sign-in, and an `account` callback on the provider that keeps nothing
2. `reauthenticateWithGitHub` alone passes `prompt: "select_account"`
3. A guard in `callbacks.signIn`: with a session cookie, a GitHub sign-in that resolves to another user is refused, shown in `DeleteAccountDialog` on `/settings`
4. `revokeGitHubGrant` stays for the rows from before this change, as a best effort

Constraints:

- This reverses the re-authorization on every GitHub sign-in (see `context/feature-history.md`)
- The grant outlives a deleted account, since revoking it needs a token
- tsc, lint, tests and build do not touch GitHub, so GitHub's real behaviour is not proven by them

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
