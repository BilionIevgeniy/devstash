# Current Feature: Sign-in Lockout Message and GitHub Pending State

## Status

In Progress

## Goals

- Lower the sign-in limit by email (`LOGIN_BY_EMAIL`) from 10 to 5 attempts per 15 minutes: five wrong passwords go through, the sixth is refused; the limit by IP stays 20
- Show when to retry in the sign-in refusal, "Too many attempts. Please try again in X minutes.", instead of "Try again later."
- Show a pending state on the "Sign in with GitHub" button while the redirect to GitHub is in progress: disabled, with a spinning icon and a "Signing in…" label
- Commit the pending change to `.claude/agents/code-reviewer.md` (it removes `model: haiku`) as its own `chore:` commit, before the feature commit

## Notes

- Retry time: NextAuth's error `code` cannot carry a number without encoding it into the code string, so when `signInWithCredentials` catches `TOO_MANY_ATTEMPTS_CODE` it asks the limiter for the reset time with `getRemaining` (which does not use up an attempt) and builds the text with `getTooManyAttemptsMessage`
- The lookup is a new function in `src/lib/rate-limit.ts` that returns `{ remaining, reset }` or `null` (logged); it only decides the wording, not access, so it does not fail closed: on `null` the message stays `TOO_MANY_ATTEMPTS_MESSAGE`
- Only counters with `remaining <= 0` count (email and IP), and the latest of their resets is used; otherwise an IP counter that is not blocked could inflate the time of the one that is
- Upstash windows follow the clock, so the time shown is between 1 and 15 minutes, not always 15, and is an estimate: `reset` marks the end of the window
- `SignInForm` needs no change: it already shows a toast for any message that starts with "Too many attempts."
- GitHub button: the form in `src/app/sign-in/page.tsx` is a server component with a plain `Button`; move the button into a small client component in `features/auth/components` that reads `useFormStatus`, so the page stays a server component; the label matches the credentials form ("Signing in…") and the spinner is `Loader2Icon` from lucide-react with `size-4 animate-spin`, as in `components/ui/sonner.tsx`
- Check `DeleteAccountDialog` (`reauthenticateWithGitHub`) for the same missing pending state before deciding whether to touch it
- The full `npm run build` needs a working `DIRECT_URL`: the local `.env` points it at a pooler host and the build stopped with P1001; until that is fixed the checks are tsc, lint and `next build`
- Browser check (by the user): six wrong passwords for one test email, the sixth shows the minutes toast; after clicking "Sign in with GitHub" the button shows "Signing in…". Delete the `ratelimit:*` keys in Upstash to retry sooner
- Pushing to `main` deploys to production; the limit change and the new text only apply there after that push
- Out of scope: minutes in the email-send IP limit message, dropping the `RateLimit` table (separate migration)

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
