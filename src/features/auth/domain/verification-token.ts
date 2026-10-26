export const VERIFICATION_TOKEN_TTL_HOURS = 24;
export const INVALID_LINK_ERROR =
  "This verification link is invalid or has expired";
export const WRONG_CONFIRM_PASSWORD_MESSAGE =
  "Wrong password. If you did not create this account, use Forgot password instead.";

const MS_PER_HOUR = 60 * 60 * 1000;

export function getTokenExpiry(now: Date): Date {
  return new Date(now.getTime() + VERIFICATION_TOKEN_TTL_HOURS * MS_PER_HOUR);
}

export function isTokenExpired(expires: Date, now: Date): boolean {
  return expires < now;
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
