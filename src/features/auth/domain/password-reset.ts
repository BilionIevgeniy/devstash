export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;
export const INVALID_RESET_LINK_MESSAGE =
  "This reset link is invalid or has expired";

const IDENTIFIER_PREFIX = "password-reset:";
const MS_PER_HOUR = 60 * 60 * 1000;

export function getPasswordResetIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

export function getPasswordResetExpiry(now: Date): Date {
  return new Date(
    now.getTime() + PASSWORD_RESET_TOKEN_TTL_HOURS * MS_PER_HOUR,
  );
}

export function buildPasswordResetUrl(
  origin: string,
  email: string,
  token: string,
): string {
  const url = new URL("/reset-password", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}
