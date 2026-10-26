export const TOO_MANY_ATTEMPTS_MESSAGE = "Too many attempts. Try again later.";

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
  limit: 10,
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
