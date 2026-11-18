// The visitor's answer to the consent banner (ADR 0034). It lives only in the
// browser's `localStorage`: no server read and no cache depends on it, so the
// static pages stay static. The version is part of the stored value, so a
// later banner that asks for more starts over with every visitor.

export const CONSENT_STORAGE_KEY = "devstash-consent";

const CONSENT_VERSION = 1;

/** Accept or Decline of the measurement of real-user Web Vitals. */
export type ConsentChoice = "granted" | "denied";

// "1:granted", or null for no answer, an answer to an older banner and
// anything else that is not one of the two.
export function parseConsent(stored: string | null): ConsentChoice | null {
  if (stored === null) return null;
  const [version, choice] = stored.split(":");
  if (version !== String(CONSENT_VERSION)) return null;
  return choice === "granted" || choice === "denied" ? choice : null;
}

export function serializeConsent(choice: ConsentChoice): string {
  return `${CONSENT_VERSION}:${choice}`;
}
