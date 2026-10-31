# Authentication Security Audit

> **Historical.** This audit predates Auth Security Hardening, which fixed findings 1-6, and the move of the auth code into `features/auth/`, so its file paths and open findings are out of date. Run the `auth-auditor` agent for a current audit; it overwrites this file.

**Last Audit Date**: 2026-10-26
**Auditor**: Auth Security Agent

## Executive Summary

The custom authentication code is well built at the cryptographic and token level: bcrypt with 12 rounds, 256-bit random tokens stored only as SHA-256 hashes, single-use reset tokens consumed inside a transaction with a row-count guard, a separate identifier namespace for reset tokens, and neutral responses in the forgot-password flow. No Critical issues were found. The main gaps are operational and session related. There is no rate limiting or brute-force protection on any endpoint, and JWT sessions cannot be revoked (already documented as a known limitation). Several medium issues follow from the same theme: links built from request headers, email verification that completes on a plain GET, registration that reveals which emails exist, and account deletion that needs no re-authentication.

**Totals**: 0 Critical, 2 High, 4 Medium, 5 Low. Items marked **Known** are already listed in the project's documented limitations and are reported here with an independent severity.

## Findings

### Critical Issues

None found.

### High Severity

#### 1. No rate limiting or brute-force protection on any authentication endpoint

**Severity**: High
**File**: `src/features/auth/auth.ts`, `src/app/api/auth/register/route.ts`, `src/features/auth/_internal/actions/email-verification.ts`, `src/features/auth/_internal/actions/password-reset.ts`, `src/features/auth/_internal/actions/account.ts`
**Line(s)**: auth.ts 29-43; register/route.ts 44-76; actions/email-verification.ts 24-55; actions/password-reset.ts 58-85; actions/account.ts 52-73

**Vulnerable Code**:

```typescript
// src/features/auth/auth.ts:29-39 (no attempt counter, no throttle)
authorize: async (credentials) => {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user?.password) return null;

  const isValid = await bcrypt.compare(parsed.data.password, user.password);
  if (!isValid) return null;
```

```typescript
// src/features/auth/_internal/actions/email-verification.ts:35-46
// The cooldown is a read-only check; the write that starts the cooldown
// happens later in sendVerificationLink. Nothing is atomic.
if (!user?.password || user.emailVerified || (await wasLinkSentRecently(parsed.data))) {
  return { success: true, data: null, error: null };
}
...
const result = await sendVerificationLink(parsed.data, origin);
```

**Problem**: None of the following is throttled by IP or by account: credentials sign-in, registration, resend verification, forgot password and the change-password current-password check. NextAuth does not provide rate limiting. The `/api/auth/callback/credentials` route handler is also exposed directly, so any limit placed only in the `signInWithCredentials` Server Action can be bypassed. The 60-second email cooldown is a read-then-write sequence: `wasLinkSentRecently` / `wasResetLinkSentRecently` only read, and the token row that starts the cooldown is written later in `createVerificationToken` / `createPasswordResetToken`. Parallel requests therefore all pass the check before the first token exists.

**Attack Scenario**:
1. Password guessing and credential stuffing: an attacker sends unlimited POSTs to `/api/auth/callback/credentials`. bcrypt cost slows each check on the server but nothing limits the attacker. Accounts with weak passwords (the only rule is 8 characters) fall.
2. Email bombing: fire 50 parallel `resendVerificationEmail` or `requestPasswordReset` calls for the same victim. All 50 pass the cooldown read and 50 emails are sent (each new token replaces the previous one). Beyond the race, the cooldown still allows one email per minute per address indefinitely, and registration lets the attacker send a first email to any number of different addresses.
3. Reputation and cost: registration sends a branded email from the verified Resend domain to any address and also runs `bcrypt.hash` at 12 rounds per request, so it can burn the Resend quota, damage the sending domain reputation, and consume CPU.

**Fix**: Add a shared limiter (the stack already lists Redis as optional; Upstash works on Vercel) and apply it in `authorize` (using the `request` argument, which covers both the Server Action and the raw NextAuth route), in the register route and in each action. Use the limiter itself as the atomic cooldown so the race disappears. On Vercel, `x-forwarded-for` is overwritten by the platform, so it is a safe IP source there ([Vercel request headers](https://vercel.com/docs/headers/request-headers)).

```typescript
// src/lib/rate-limit.ts
import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export const loginByIp = new Ratelimit({ redis, prefix: "rl:login:ip", limiter: Ratelimit.slidingWindow(20, "15 m") });
export const loginByEmail = new Ratelimit({ redis, prefix: "rl:login:email", limiter: Ratelimit.slidingWindow(5, "15 m") });
export const registerByIp = new Ratelimit({ redis, prefix: "rl:register:ip", limiter: Ratelimit.slidingWindow(5, "1 h") });
// One email per address per 60 s, enforced atomically (replaces the read-then-write cooldown)
export const emailActionByAddress = new Ratelimit({ redis, prefix: "rl:email:addr", limiter: Ratelimit.fixedWindow(1, "60 s") });
export const emailActionByIp = new Ratelimit({ redis, prefix: "rl:email:ip", limiter: Ratelimit.slidingWindow(10, "1 h") });
export const passwordCheckByUser = new Ratelimit({ redis, prefix: "rl:pwcheck:user", limiter: Ratelimit.slidingWindow(5, "15 m") });

export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
```

```typescript
// src/features/auth/_internal/errors.ts
export const TOO_MANY_ATTEMPTS_CODE = "too_many_attempts";
export class TooManyAttemptsError extends CredentialsSignin {
  code = TOO_MANY_ATTEMPTS_CODE;
}

// src/features/auth/auth.ts
authorize: async (credentials, request) => {
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const [byIp, byEmail] = await Promise.all([
    loginByIp.limit(getClientIp(request.headers)),
    loginByEmail.limit(parsed.data.email),
  ]);
  if (!byIp.success || !byEmail.success) throw new TooManyAttemptsError();
  // ...existing lookup and bcrypt.compare
}
```

Then map `TOO_MANY_ATTEMPTS_CODE` to a "Too many attempts, try again later" message in `signInWithCredentials`. For the email actions, call `emailActionByAddress.limit(email)` before the user lookup and return the same neutral success when it is exhausted. Apply `registerByIp`, `emailActionByIp` and `passwordCheckByUser` (key: user id) in the register route, the email actions, `changePassword` and the account-deletion password check from finding 6. The per-email login limiter allows an attacker to lock a victim out for 15 minutes; if that matters, key it on email plus a coarse IP bucket and add a CAPTCHA step after repeated failures.

---

#### 2. JWT sessions are not revoked by password reset, password change or account deletion (Known)

**Severity**: High
**File**: `src/features/auth/auth.ts`, `src/features/auth/password-reset.ts`, `src/features/auth/account.ts`
**Line(s)**: auth.ts 21, 46-53; password-reset.ts 117; account.ts 28, 42-49

**Vulnerable Code**:

```typescript
// src/features/auth/auth.ts:21, 46-53
session: { strategy: "jwt" },
...
callbacks: {
  session({ session, token }) {
    if (token.sub) session.user.id = token.sub;
    return session;
  },
},
```

```typescript
// src/features/auth/password-reset.ts:117 and account.ts:28 only update the hash
await tx.user.update({ where: { email }, data: { password } });
```

**Problem**: The session is a stateless JWT with the Auth.js default lifetime of 30 days of inactivity (`@auth/core/lib/init.js` line 38). `@auth/core/lib/actions/session.js` (lines 44-51) re-encodes the token with a fresh expiry whenever the session is read, so a stolen session that keeps being used effectively never expires. Nothing on the server ties the token to the current password, and `auth()` never checks that the user row still exists. This is the documented limitation, but the severity is High because password reset is the standard recovery action after a compromise and it does not actually evict the attacker.

**Attack Scenario**: An attacker obtains a session cookie (shared computer, malware, a future XSS). The victim notices, uses Forgot password and picks a new password. The attacker's cookie keeps working, including for the destructive actions in finding 6. After account deletion, the old JWT also keeps passing `getSessionUser()`; today the queries just return empty data, but any future write that does not re-check the user relies on a foreign-key failure.

**Fix**: Add a session version to `User`, copy it into the token at sign-in, compare it on every `auth()` call, and bump it on every credential change. In Auth.js, returning `null` from the `jwt` callback clears the session cookie (`session.js` lines 54-56). The proxy uses `auth.config.ts` without callbacks, so it only checks cookie validity; server components and Server Actions go through `auth.ts` and reject revoked tokens.

```prisma
model User {
  // ...
  sessionVersion Int @default(0)
}
```

```typescript
// src/features/auth/auth.ts
session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
callbacks: {
  async jwt({ token, user }) {
    if (user?.id) {
      const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { sessionVersion: true },
      });
      token.sv = record?.sessionVersion ?? 0;
      return token;
    }
    if (!token.sub) return null;
    const current = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { sessionVersion: true },
    });
    if (!current || current.sessionVersion !== token.sv) return null;
    return token;
  },
  session({ session, token }) { /* unchanged */ },
},
```

Add `sv?: number` to the `JWT` interface in `src/features/auth/next-auth.d.ts`. In `resetPasswordWithToken` and `changeUserPassword` use `data: { password, sessionVersion: { increment: 1 } }`. After a password change, sign the current user out as well (or call the NextAuth `update` flow) so they re-authenticate. A deleted user then fails the `!current` check automatically. Also send a "your password was changed" email to the account address after reset and change so the owner learns about it.

### Medium Severity

#### 3. Verification and reset links are built from request headers (Host / X-Forwarded-Host poisoning)

**Severity**: Medium (Low on Vercel, where the platform sets forwarded headers; higher on any other host or reverse proxy that passes client-supplied values)
**File**: `src/features/auth/_internal/request-origin.ts`, `src/app/api/auth/register/route.ts`
**Line(s)**: request-origin.ts 3-10; register/route.ts 71-74

**Vulnerable Code**:

```typescript
// src/features/auth/_internal/request-origin.ts
const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
if (!host) return null;
const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
return `${protocol}://${host}`;
```

```typescript
// src/app/api/auth/register/route.ts:71-74
const emailResult = await sendVerificationLink(user.email, new URL(request.url).origin);
```

**Problem**: The origin placed in the emailed link comes from headers the client may control. The same applies to `request.url`, which Next.js derives from the host header. The link contains the secret token, so if the origin is attacker-controlled the token is sent to the attacker's server. The protocol also silently falls back to `http`.

**Attack Scenario**: On a deployment that does not overwrite `X-Forwarded-Host` (self-hosted `next start` behind a naive proxy, some CDNs, or a misconfigured preview setup), the attacker sends the `requestPasswordReset` request for a victim's email with `X-Forwarded-Host: evil.example`. Server Action origin checks compare `Origin` with the forwarded host, so a crafted `Origin: https://evil.example` is consistent with the forged host. The victim receives a genuine reset email whose button points to `https://evil.example/reset-password?token=...`. When the victim clicks it, the attacker captures the token and resets the password. I could not confirm from Vercel documentation that `x-forwarded-host` is sanitised (only `x-forwarded-for` is documented as overwritten), so do not rely on it.

**Fix**: Build links from a configured, trusted base URL. Put the helper in `src/lib` so both the register route and the actions can import it (the route cannot import from `_internal/`).

```typescript
// src/lib/app-url.ts
import "server-only";

export function getAppOrigin(): string {
  const configured = process.env.APP_URL; // e.g. https://your-production-domain
  if (configured) return new URL(configured).origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // set by Vercel, preview deployments
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("APP_URL is not set");
}
```

Replace `getRequestOrigin()` and `new URL(request.url).origin` with `getAppOrigin()`, delete `_internal/request-origin.ts`, and add `APP_URL` to `.env.example` and the Vercel production environment.

---

#### 4. Email verification completes on an unauthenticated GET and does not prove the registrant knows the password (account pre-hijacking)

**Severity**: Medium
**File**: `src/app/verify-email/page.tsx`, `src/features/auth/email-verification.ts`, `src/app/api/auth/register/route.ts`
**Line(s)**: page.tsx 14-20; email-verification.ts 67-100; register/route.ts 59-69

**Vulnerable Code**:

```typescript
// src/app/verify-email/page.tsx:17-20 (state change during page render)
const parsed = searchParamsSchema.safeParse(await searchParams);
const result = parsed.success
  ? await verifyEmailToken(parsed.data.email, parsed.data.token)
  : { success: false, error: INVALID_LINK_ERROR };
```

**Problem**: Anyone can register any email address with a password of their choosing (the address is not owned or verified at that time). The account is created immediately with the attacker's password hash, and the verification email goes to the real owner. When the link is opened, `User.emailVerified` is set and the attacker's password becomes a fully working credential for the real owner's address. Because verification runs as a side effect of a GET request render, the link also gets consumed by anything that fetches it without user intent (corporate mail gateways such as Safe Links, antivirus link scanners, prefetching clients). The reset page already does this correctly (read-only check on GET, change on submit); the verify page does not. This is the "classic pre-hijacking" pattern described in Microsoft Research's "Pre-hijacking Attacks on Web User Accounts".

**Attack Scenario**: The attacker registers `victim@company.com` with password `P`. The victim receives "Thanks for signing up for DevStash" and either clicks it (one click) or their mail gateway fetches the link (zero clicks). The account is now verified and the attacker signs in with `P`. If the victim later signs in with the same email via GitHub they get `OAuthAccountNotLinked`, and if they just start using the account they store snippets, prompts and commands in an account the attacker can read. Because of finding 2, resetting the password afterwards does not remove the attacker's existing session.

**Fix**: Do not change state on GET, and require the verifier to prove they know the password the account was created with. A legitimate registrant knows it; a victim of pre-hijacking does not, and can use Forgot password instead.

```typescript
// src/app/verify-email/page.tsx: validate read-only, then render a form
const valid =
  parsed.success && (await isVerificationTokenValid(parsed.data.email, parsed.data.token));
if (!valid) { /* existing failure card */ }
return (
  <AuthCard title="Confirm your email" description="Enter your account password to finish verification">
    <ConfirmEmailForm email={parsed.data.email} token={parsed.data.token} />
  </AuthCard>
);
```

```typescript
// src/features/auth/_internal/actions/email-verification.ts
export async function confirmEmail(input: { email: string; token: string; password: string }) {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return failure("Invalid request");

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { password: true },
  });
  if (!user?.password || !(await bcrypt.compare(parsed.data.password, user.password))) {
    return failure("Wrong password. If you did not create this account, use Forgot password instead.");
  }
  const result = await verifyEmailToken(parsed.data.email, parsed.data.token);
  return result.success ? SUCCESS : failure(result.error ?? GENERIC_ERROR);
}
```

Add `isVerificationTokenValid` next to `isPasswordResetTokenValid` (read-only lookup, no deletion), make `verifyEmailToken` check `deleteMany().count === 1` inside the transaction as the reset flow does, and rate limit `confirmEmail` per user (finding 1). Optionally delete unverified credentials accounts older than, for example, 7 days so addresses cannot be squatted indefinitely.

---

#### 5. Registration reveals which emails are registered

**Severity**: Medium
**File**: `src/app/api/auth/register/route.ts`
**Line(s)**: 59-63, 79-84

**Vulnerable Code**:

```typescript
const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
if (existing) return failure("User already exists", 409);
...
if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
  return failure("User already exists", 409);
}
```

**Problem**: The forgot-password flow is deliberately silent about unknown accounts, but registration answers 409 "User already exists" for any registered address (credentials or GitHub). It defeats the other protections: an attacker can query registration instead. There is no rate limit (finding 1), so bulk enumeration is free, and the result enables targeted phishing, credential stuffing lists and the pre-hijacking in finding 4 (the attacker learns which addresses are still free).

**Attack Scenario**: Script `POST /api/auth/register` with a list of addresses and a throwaway password; every 409 is a confirmed DevStash user.

**Fix**: Return the same response for new and existing addresses, and tell the real owner by email. Hash the password first so timing is equal. The `RegisterForm` only reads `success` and `error`, and `CheckEmailNotice` already uses neutral wording.

```typescript
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
const existing = await prisma.user.findUnique({
  where: { email },
  select: { id: true, password: true, emailVerified: true },
});

if (existing) {
  if (existing.password && !existing.emailVerified) {
    await sendVerificationLink(email, getAppOrigin()); // subject to the atomic cooldown from finding 1
  }
  // verified or GitHub-only owner: optionally send a "someone tried to register with your address" email
  return Response.json({ success: true, data: null, error: null }, { status: 201 });
}
// ...create user as today, but return data: null and map P2002 to the same 201 response
```

---

#### 6. Account deletion requires no re-authentication

**Severity**: Medium
**File**: `src/features/auth/_internal/actions/account.ts`, `src/features/auth/account.ts`
**Line(s)**: actions/account.ts 75-89; account.ts 35-50

**Vulnerable Code**:

```typescript
export async function deleteAccount(): Promise<AuthActionState> {
  const userId = await getSignedInUserId();
  if (!userId) return failure(SIGNED_OUT_ERROR);
  try {
    await deleteUserAccount(userId);
```

**Problem**: A valid session cookie alone is enough to permanently delete the user and all of their items, collections and tags. Password change correctly requires the current password, but deletion, the more destructive and irreversible action, does not. Combined with finding 2, a stolen session can be used for 30 days or more and cannot be revoked.

**Attack Scenario**: An attacker with a hijacked cookie (or someone using an unattended signed-in browser) opens `/profile`, clicks Delete account and confirms the dialog. The data is gone; there is no backup or soft-delete.

**Fix**: Require the current password for accounts that have one, and apply the password-check rate limit. For GitHub-only accounts, require a fresh GitHub sign-in (store a `reauthAt` timestamp in the token in the `jwt` callback when `user` is present, and require it to be within a few minutes) or at minimum make the user type their email address.

```typescript
// src/features/auth/account.ts
export async function deleteUserAccount(userId: string, password?: string): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, password: true },
  });
  if (!user) return { success: true, error: null };
  if (user.password) {
    if (!password || !(await bcrypt.compare(password, user.password))) {
      return { success: false, error: "Password is incorrect" };
    }
  }
  await prisma.$transaction([ /* existing token cleanup and user.delete */ ]);
  return { success: true, error: null };
}
```

`deleteAccount(input: { password?: string })` should pass the value through and the dialog should include a password field when `hasPassword` is true.

### Low Severity

#### 7. Timing-based account enumeration (credentials sign-in is new; forgot-password and resend-verification are Known)

**Severity**: Low
**File**: `src/features/auth/auth.ts`, `src/features/auth/_internal/actions/password-reset.ts`, `src/features/auth/_internal/actions/email-verification.ts`
**Line(s)**: auth.ts 33-39; actions/password-reset.ts 69-79; actions/email-verification.ts 31-46

**Vulnerable Code**:

```typescript
// auth.ts: unknown or GitHub-only emails return before the bcrypt comparison
if (!user?.password) return null;
const isValid = await bcrypt.compare(parsed.data.password, user.password);
```

**Problem**: An unknown email returns in a few milliseconds, a known credentials email takes a full bcrypt round at cost 12 (hundreds of milliseconds). For forgot-password and resend, the known path additionally writes two rows and calls the Resend API, so the difference is large and easy to measure. The two email flows are documented as known. The sign-in timing difference is not documented. It is rated Low because registration already reveals the same fact (finding 5) and the wording of all responses is neutral.

**Attack Scenario**: Time repeated sign-in or forgot-password requests; slow responses indicate a registered address.

**Fix**: Always run a comparison, and run the slow work after the response is sent.

```typescript
// auth.ts (import { randomBytes } from "node:crypto")
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomBytes(16).toString("hex"), 12));

const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
const hash = user?.password ?? (await getDummyHash());
const isValid = await bcrypt.compare(parsed.data.password, hash);
if (!user?.password || !isValid) return null;
```

```typescript
// requestPasswordReset / resendVerificationEmail
import { after } from "next/server";

const origin = getAppOrigin();
after(async () => {
  // user lookup, cooldown check and sendPasswordResetLink(...) with the same error logging
});
return SUCCESS;
```

---

#### 8. Resend verification returns a distinguishable error for existing unverified accounts

**Severity**: Low
**File**: `src/features/auth/_internal/actions/email-verification.ts`
**Line(s)**: 43-49

**Vulnerable Code**:

```typescript
const origin = await getRequestOrigin();
if (!origin) return failure(GENERIC_ERROR);

const result = await sendVerificationLink(parsed.data, origin);
if (!result.success) {
  return failure("We couldn't send the email. Please try again later.");
}
```

**Problem**: This branch is only reachable for an address that has a password, is unverified and is outside the cooldown. All other cases return the neutral success message, so a send failure (Resend outage, bounced or blocked address) reveals that the account exists. The forgot-password action already handles this correctly by only logging the failure ("reporting it would reveal that the account exists").

**Attack Scenario**: An attacker submits addresses that Resend rejects (for example suppressed addresses or domains that pass `z.email` but cannot receive mail) and distinguishes "couldn't send" from the neutral toast.

**Fix**: Log the failure and return the same neutral success, as `requestPasswordReset` does.

```typescript
const result = await sendVerificationLink(parsed.data, getAppOrigin());
if (!result.success) console.error("Resend verification failed:", result.error);
return { success: true, data: null, error: null };
```

---

#### 9. Demo account can delete itself (Known) and its seeded password must be controlled

**Severity**: Low
**File**: `src/features/auth/account.ts`, `prisma/seed.ts`, `.env.example`
**Line(s)**: account.ts 35-50; seed.ts 40-50; .env.example 8

**Vulnerable Code**:

```typescript
// prisma/seed.ts:41-49: verified, password-enabled account whose password comes from env
const password = await bcrypt.hash(requireEnv("SEED_DEMO_PASSWORD"), BCRYPT_ROUNDS);
return prisma.user.upsert({ where: { email: demoUser.email }, update: {}, create: { ...demoUser, password, emailVerified: new Date() } });
```

**Problem**: `deleteUserAccount` and `changeUserPassword` apply to `demo@devstash.io` like any other user. The seed marks the demo user as verified with a password taken from `SEED_DEMO_PASSWORD`, whose example value is `change-me`. If the production database was ever seeded with the example value, anyone can sign in as the demo user. Whether production was seeded this way cannot be determined from the repository.

**Attack Scenario**: Anyone who knows or guesses the demo password signs in, changes the password or deletes the account, breaking the demo for everyone else.

**Fix**: Block destructive account actions for the demo user and make sure a production seed uses a strong, secret value (or does not seed the demo user at all).

```typescript
import { DEMO_USER_EMAIL } from "@/lib/db/demo-user";

if (user.email === DEMO_USER_EMAIL) {
  return { success: false, error: "The demo account cannot be modified" };
}
```

Apply the same guard in `changeUserPassword` and in `resetPasswordWithToken`.

---

#### 10. Weak input limits and password policy details

**Severity**: Low
**File**: `src/app/api/auth/register/route.ts`, `src/features/auth/domain/password-reset.ts`, `src/features/auth/_internal/actions/account.ts`
**Line(s)**: register/route.ts 11-28; domain/password-reset.ts 2-3; actions/account.ts 17-35

**Vulnerable Code**:

```typescript
name: z.string().trim().min(1, "Name is required"),            // no max
email: z.string().trim().toLowerCase().pipe(z.email(...)),      // no max (RFC limit is 254)
password: z.string().min(8, ...).max(72, ...),                  // 72 characters, not 72 bytes
```

**Problem**:
- `name` and `email` have no maximum length. An oversized value is stored in the database (the account is created before the email is sent) and only the platform body limit applies.
- bcryptjs hashes at most 72 bytes and silently truncates the rest (documented in its README and exposed as `bcrypt.truncates`). Zod's `.max(72)` counts characters, so a password containing multi-byte characters can be longer than 72 bytes and be truncated without the user knowing.
- The only strength rule is 8 characters, with no check against common or breached passwords. Length 8 meets the NIST minimum, but combined with finding 1 weak passwords are directly guessable.
- The 8 and 72 limits are duplicated in the register route, `RegisterForm.tsx` and `domain/password-reset.ts` (already a deferred item).

**Attack Scenario**: Low impact on its own. A registered user with a weak password such as `password1` is cracked quickly by the unthrottled login (finding 1).

**Fix**: Add limits and one shared password schema.

```typescript
// src/features/auth/domain/password-reset.ts (or a new schemas.ts)
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`)
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Password is too long");

name: z.string().trim().min(1).max(100),
email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
```

Optionally reject passwords found in the Have I Been Pwned range API (k-anonymity, only the first five hash characters leave the server) on register, reset and change. `domain/` must stay free of I/O, so keep the schema there pure and the breach check in the action layer.

---

#### 11. OAuth access, refresh and ID tokens are stored in plaintext

**Severity**: Low
**File**: `src/features/auth/auth.ts`, `prisma/schema.prisma`
**Line(s)**: auth.ts 20; schema.prisma 38-43

**Vulnerable Code**:

```typescript
adapter: PrismaAdapter(prisma),
```

**Problem**: `PrismaAdapter.linkAccount` runs `account.create({ data })` with the whole provider response (`@auth/prisma-adapter/index.js` line 20), so the GitHub `access_token` (and `id_token` / `refresh_token` when present) is saved in plaintext in the `Account` table. The application never calls the GitHub API after sign-in, so the stored token has no use but increases the impact of a database leak (a read-only dump becomes live GitHub access with the granted scopes).

**Attack Scenario**: A database backup or read-only SQL injection elsewhere exposes the table; the attacker uses the GitHub tokens against the user's GitHub account within the granted scope.

**Fix**: Do not persist tokens the app does not use.

```typescript
const baseAdapter = PrismaAdapter(prisma);

adapter: {
  ...baseAdapter,
  linkAccount: async (account) => {
    const { access_token, refresh_token, id_token, ...rest } = account;
    return baseAdapter.linkAccount!(rest);
  },
},
```

(Lint will flag the unused destructured variables unless they are prefixed or the rule is configured to ignore rest siblings.)

## Passed Checks

- Password hashing uses bcryptjs with 12 rounds in registration, reset, change password and the seed script; hashes are never returned to the client (`getUserProfile` reduces the hash to `hasPassword`, the register route selects only `id`, `email`, `name`, and `authorize` returns only `id`, `email`, `name`). The JWT contains no password data.
- Password comparison uses `bcrypt.compare`; credentials sign-in returns the same generic "Invalid email or password" for unknown email, wrong password and GitHub-only accounts, and the unverified-email message appears only after the correct password has been supplied.
- Verification and reset tokens use `crypto.randomBytes(32)` (256 bits), are stored only as SHA-256 hashes, so a database read does not expose usable links, and the `token` column is unique.
- Reset tokens expire after 1 hour, verification tokens after 24 hours; expiry is enforced on every use.
- Reset tokens are single use: the token is deleted inside the same transaction that writes the new password, and the transaction aborts unless exactly one row was deleted, which closes the concurrent-use race. A newer request replaces the previous token for that address.
- Reset tokens are bound to the address through the `password-reset:` identifier prefix, and a verification token cannot be used as a reset token or the reverse; `z.email()` (regex in `zod/v4/core/regexes.js`) rejects `:` so an email cannot collide with the prefix namespace. The bcrypt hash is only computed after a cheap token validity check.
- Forgot-password returns an identical neutral response for unknown, GitHub-only and cooldown cases, and send failures are only logged (timing aside, see finding 7). The resend action is neutral except for the case in finding 8.
- Change password verifies the current password, enforces length limits, and takes the user id from `auth()` rather than from client input. Account deletion also takes the id from the session, so one user cannot act on another user's record.
- Account deletion cascades through the schema (`Account`, `Session`, `Item`, `ItemType`, `Collection`, `Tag`, join tables use `onDelete: Cascade`) and explicitly removes both verification and reset tokens in the same transaction.
- OAuth account linking is safe: `allowDangerousEmailAccountLinking` is not enabled, so a GitHub sign-in cannot take over an existing credentials account with the same email (verified in `@auth/core/lib/actions/callback/handle-login.js`, which throws `OAuthAccountNotLinked`).
- Credentials users cannot sign in before verifying the email, and the check happens in `authorize` (the NextAuth route handler cannot bypass it).
- Server Actions that change data (`changePassword`, `deleteAccount`) call `auth()` themselves instead of relying on the proxy; every dashboard and profile component calls `getSessionUser()` (which redirects) in addition to the proxy matcher, so a route missing from the matcher is still guarded at the data layer.
- Sign-in always redirects to the fixed `/dashboard`; the `callbackUrl` that the proxy appends is never consumed, so there is no open redirect.
- No raw SQL (`$queryRaw`, `$executeRaw`) and no `dangerouslySetInnerHTML` in `src` (excluding generated Prisma code); Prisma parameterises all queries. Emails entering through the custom flows are validated with Zod and lowercased.
- Email HTML escapes the URL and uses only static copy; the recipient address is validated before use, so header injection is not possible.
- NextAuth handles CSRF, `SameSite=Lax` session cookies, OAuth state and the sign-in error redirects; none of that was reviewed as custom code. `.env` is gitignored and only `.env.example` is tracked.

## Recommendations Summary

1. Add rate limiting and an atomic email cooldown to login (inside `authorize`), registration, resend verification, forgot password, email confirmation and the password checks (finding 1).
2. Make sessions revocable with a `sessionVersion` check in the `jwt` callback, bump it on reset and change, shorten `maxAge`, and send a notification email on credential changes (finding 2; known limitation).
3. Stop deriving link origins from request headers; use a configured `APP_URL` (finding 3).
4. Move email verification off the GET render and require proof of the registration password (finding 4).
5. Return an identical response from registration for new and existing addresses (finding 5).
6. Require the password (or a fresh GitHub sign-in) to delete an account (finding 6).
7. Equalise timing on sign-in, forgot-password and resend using a dummy bcrypt comparison and `after()` (finding 7; forgot-password and resend timing are known).
8. Make the resend send-failure response neutral (finding 8).
9. Protect the demo account from deletion and password changes and use a strong seed password in production (finding 9; self-deletion is known).
10. Add length limits, a byte-aware password rule and a shared password schema (finding 10).
11. Stop storing unused OAuth tokens in the `Account` table (finding 11).
