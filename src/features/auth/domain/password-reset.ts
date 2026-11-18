import {
  emailLinkUrl,
  tokenExpiry,
} from "@/features/auth/domain/verification-token";

export const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;
export const MIN_PASSWORD_LENGTH = 8;
// A cap in characters on a password that is checked, not set: an account from
// before the byte rule may hold a 72-character password with accents.
export const MAX_PASSWORD_LENGTH = 72;
// bcrypt hashes only the first 72 bytes of its input, so a longer new password
// would verify against any other password with the same first 72 bytes.
export const MAX_PASSWORD_BYTES = 72;

const IDENTIFIER_PREFIX = "password-reset:";

export function getPasswordResetIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

export function getPasswordResetExpiry(now: Date): Date {
  return tokenExpiry(now, PASSWORD_RESET_TOKEN_TTL_HOURS);
}

export function buildPasswordResetUrl(
  origin: string,
  email: string,
  token: string,
): string {
  return emailLinkUrl(origin, "/reset-password", email, token);
}

// UTF-8, the encoding bcryptjs hashes: "é" counts 2, an emoji 4.
export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}
