# Current Feature: Settings Page

## Status

In Progress

## Goals

- A new `/settings` page lives at `src/app/(app)/settings/page.tsx`, inside the shared app layout
- `/settings` is protected: `/settings/:path*` is added to the matcher in `src/proxy.ts`
- The sidebar user dropdown (`UserArea.tsx`) has a Settings link between Profile and Sign out
- The Account section (change password, delete account) moves from `/profile` to `/settings`; `/profile` keeps only the profile info and usage stats
- Moved features behave exactly as they did before

## Notes

- Password form: `/profile` has no "forgot password", it has `ChangePasswordForm`, so that is what moves. The "Forgot password?" link stays on the sign-in page, because it is for signed-out users
- GitHub re-auth redirect: `reauthenticateWithGitHub` sends users back to `/profile` (`PROFILE_URL` in `src/features/auth/actions/sign-in.ts`). It must change to `/settings`, or GitHub users land on a page with no delete button after the dialog told them to come back to finish
- Moved component: `AccountActions.tsx` moves to `settings/_components/`. It stays in the route because it combines `auth` and `account`. Its one change: a missing profile redirects to `/sign-in`, as `ProfileInfo` did for it on `/profile`
- Page structure: `/settings` has its own `loading.tsx` (the layout is `force-dynamic`, so a click would otherwise show nothing until the server responds) and no `<Suspense>`. The skeleton and its height constants live in `loading.tsx`; a later section brings its own `<Suspense>`
- Accepted layout shift: the skeleton reserves the password form, which GitHub-only users do not see. `hasPassword` is not in the session, so the skeleton cannot know
- `getUserProfile` loses `cache()`: its two callers are on different pages after the move
- `.claude/agents/auth-auditor.md` also globs `src/app/(app)/settings/**/*`
- Docs to update: `docs/modules.md` lines 98 and 129, `docs/architecture.md` lines 18 and 33 (new route and proxy guard)
- Scope: no new actions, models or pure rules, so no new tests. The billing, editor and data sections mentioned in `docs/modules.md` stay for their own specs

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
