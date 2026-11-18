export const VERIFICATION_TOKEN_TTL_HOURS = 24;

const MS_PER_HOUR = 60 * 60 * 1000;

// The expiry of a token issued at `now` that lives `ttlHours`; every kind of
// emailed link uses it with its own lifetime.
export function tokenExpiry(now: Date, ttlHours: number): Date {
  return new Date(now.getTime() + ttlHours * MS_PER_HOUR);
}

// The path of an emailed link: its page with the token and the address in the
// query, encoded.
export function emailLinkPath(
  path: string,
  email: string,
  token: string,
): string {
  const query = new URLSearchParams({ token, email });
  return `${path}?${query.toString()}`;
}

// The full link of an email; any path of the origin is replaced.
export function emailLinkUrl(
  origin: string,
  path: string,
  email: string,
  token: string,
): string {
  return new URL(emailLinkPath(path, email, token), origin).toString();
}

export function getTokenExpiry(now: Date): Date {
  return tokenExpiry(now, VERIFICATION_TOKEN_TTL_HOURS);
}

export function isTokenExpired(expires: Date, now: Date): boolean {
  return expires < now;
}

export function buildVerificationUrl(
  origin: string,
  email: string,
  token: string,
): string {
  return emailLinkUrl(origin, "/verify-email", email, token);
}
