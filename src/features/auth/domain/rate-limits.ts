const TOO_MANY_ATTEMPTS_PREFIX = "Too many attempts.";

export const TOO_MANY_ATTEMPTS_MESSAGE = `${TOO_MANY_ATTEMPTS_PREFIX} Try again later.`;

const MINUTE_SECONDS = 60;
const HOUR_SECONDS = 60 * MINUTE_SECONDS;

// Credentials sign-in counts every attempt; the per-email counter is reset
// after a successful sign-in.
export const LOGIN_BY_IP = {
  name: "login:ip",
  limit: 20,
  windowSeconds: 15 * MINUTE_SECONDS,
} as const;

export const LOGIN_BY_EMAIL = {
  name: "login:email",
  limit: 5,
  windowSeconds: 15 * MINUTE_SECONDS,
} as const;

export const REGISTER_BY_IP = {
  name: "register:ip",
  limit: 5,
  windowSeconds: HOUR_SECONDS,
} as const;

// One email per address per minute, enforced by the counter itself so
// parallel requests cannot all pass a read-then-write check.
export const VERIFICATION_EMAIL_BY_ADDRESS = {
  name: "verification-email:address",
  limit: 1,
  windowSeconds: MINUTE_SECONDS,
} as const;

export const RESET_EMAIL_BY_ADDRESS = {
  name: "reset-email:address",
  limit: 1,
  windowSeconds: MINUTE_SECONDS,
} as const;

export const EMAIL_BY_IP = {
  name: "email:ip",
  limit: 10,
  windowSeconds: HOUR_SECONDS,
} as const;

// Only consumed once the emailed token has checked out, so nobody can use it
// to lock an address out without holding a valid link.
export const CONFIRM_EMAIL_BY_ADDRESS = {
  name: "confirm-email:address",
  limit: 5,
  windowSeconds: 15 * MINUTE_SECONDS,
} as const;

export const PASSWORD_CHECK_BY_USER = {
  name: "password-check:user",
  limit: 5,
  windowSeconds: 15 * MINUTE_SECONDS,
} as const;

// `reset` is the Unix time in milliseconds at which the window ends. Never
// below one second, so a refusal always tells the client to wait.
export function getRetryAfterSeconds(reset: number, now: number): number {
  return Math.max(1, Math.ceil((reset - now) / 1000));
}

// Rounds up to whole minutes: telling a client to retry earlier than the
// window ends would only earn it another refusal.
function formatTooManyAttemptsMessage(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / MINUTE_SECONDS));
  const unit = minutes === 1 ? "minute" : "minutes";
  return `${TOO_MANY_ATTEMPTS_PREFIX} Please try again in ${minutes} ${unit}.`;
}

export function getTooManyAttemptsMessage(reset: number, now: number): string {
  return formatTooManyAttemptsMessage(getRetryAfterSeconds(reset, now));
}

interface CounterStatus {
  remaining: number;
  reset: number;
}

// Of the counters that are used up, the latest reset is when the client can
// try again; a counter with attempts left would only inflate the time. Null
// when no counter is known to be used up.
export function getBlockingReset(
  counters: (CounterStatus | null)[],
): number | null {
  const resets = counters.flatMap((counter) =>
    counter && counter.remaining <= 0 ? [counter.reset] : [],
  );
  return resets.length > 0 ? Math.max(...resets) : null;
}
