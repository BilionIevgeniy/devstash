export const VERIFICATION_TOKEN_TTL_HOURS = 24;

const MS_PER_HOUR = 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function getTokenExpiry(now: Date): Date {
  return new Date(now.getTime() + VERIFICATION_TOKEN_TTL_HOURS * MS_PER_HOUR);
}

export function isTokenExpired(expires: Date, now: Date): boolean {
  return expires < now;
}

export function wasSentWithinCooldown(expires: Date, now: Date): boolean {
  const sentAt = expires.getTime() - VERIFICATION_TOKEN_TTL_HOURS * MS_PER_HOUR;
  return now.getTime() - sentAt < RESEND_COOLDOWN_MS;
}

export function buildVerificationUrl(
  origin: string,
  email: string,
  token: string,
): string {
  const url = new URL("/verify-email", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}
