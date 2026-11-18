export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
export const MIN_PASSWORD_LENGTH = 8;
// A cap in characters on a password that is checked, not set: an account from
// before the byte rule may hold a 72-character password with accents.
export const MAX_PASSWORD_LENGTH = 72;
// bcrypt hashes only the first 72 bytes of its input, so a longer new password
// would verify against any other password with the same first 72 bytes.
export const MAX_PASSWORD_BYTES = 72;

const IDENTIFIER_PREFIX = "password-reset:";
const MS_PER_HOUR = 60 * 60 * 1000;

export function getPasswordResetIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

export function getPasswordResetExpiry(now: Date): Date {
  return new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_HOURS * MS_PER_HOUR);
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

// UTF-8, the encoding bcryptjs hashes: "é" counts 2, an emoji 4.
export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}
