# Current Feature: Rate Limiting for Auth (Upstash Redis)

## Status

In Progress

## Goals

- Add `@upstash/ratelimit` and `@upstash/redis`; document `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env.example`
- Reimplement `src/lib/rate-limit.ts` on Upstash with a sliding window, keeping the policy constants in `features/auth/domain/rate-limits.ts` and every existing call site working
- Return `{ success, remaining, reset }` from the checks instead of a bare boolean
- Fail closed when Upstash is unavailable: the request is refused and the error is logged
- Send `Retry-After` and `{ error: "Too many attempts. Please try again in X minutes." }` on 429 responses
- Show the rate-limit error as a toast on the forms
- Remove the Postgres limiter code (`consumeRateLimit` upsert, pruning) once Upstash is in place

## Notes

- Spec: `context/features/rate-limiting-spec.md`. Its Overview says to refactor to Upstash once rate limiting is implemented; the Postgres limiter from "Auth Security Hardening" (commit 07a425d) is that implementation, so this feature is a migration, not a new build
- **Fail mode deliberately differs from the spec.** The spec says fail open; here it fails closed, because most of these limits guard credential guessing and email sending, and failing open would leave sign-in unthrottled during an Upstash outage. Trade-off: Upstash becomes a hard dependency for sign-in, registration and the email flows. Keep the mode in one place so it can be flipped
- Callers to keep working: `auth.ts` (`authorize`: login by IP and by email, `resetRateLimit` after a correct password), `registration.ts` and `email-rate-limit.ts` (`checkEmailSend`), `api/auth/register/route.ts`, `_internal/actions/account.ts`, `_internal/actions/email-verification.ts`
- `Retry-After` and a 429 status only apply to the register route; the other limits run inside Server Actions and NextAuth `authorize`, where the result has to reach the UI through the action result and a toast
- Keep the existing behaviours: IPv6 clients counted by /64 prefix, requests without a client IP skip the per-IP limits, identifiers hashed before they reach the store, per-email login counter reset after a correct password (check that the Upstash library has an equivalent reset)
- Fail closed in practice: the `@upstash/ratelimit` `timeout` option lets a request through by default (`success: true`, `reason: "timeout"`), so a timeout counts as a refusal, and an error thrown by `limit()` is logged and rethrown as a `RateLimitUnavailableError` (defined in `src/lib/rate-limit.ts`); the existing try/catch blocks turn it into the generic "Something went wrong" message (500 on the register route), never into "Too many attempts"
- Credentials are required in every environment, with no development fallback (decided at start); the Upstash client and the limiters are created lazily on first use so `npm run build` never needs Redis, and each environment should use its own Upstash database
- Limiter settings (algorithm, timeout, cache) follow what the Upstash docs recommend and are listed per policy in the step 3 plan; the limits and windows in `domain/rate-limits.ts` stay as they are unless changed explicitly
- Deploy: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel for Production and Preview before pushing to main
- Follow-up, not part of this feature: dropping the `RateLimit` table needs a Prisma migration, which a push to main applies to production, so it gets its own change
- Out of scope: rate limiting middleware (the spec's "later" idea), CAPTCHA after repeated sign-in failures

## History

Completed features are logged, oldest first, in context/feature-history.md. Read it only when you need past decisions.
