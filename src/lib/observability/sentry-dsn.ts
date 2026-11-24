// Which DSN is used, apart from the SDK so that next.config.ts can read it for
// the Content-Security-Policy (ADR 0036) without loading Sentry.

const EU_HOST_SUFFIX = ".de.sentry.io";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

// The privacy notice says the events stay in Sentry's EU region, and a DSN
// pasted from an organization in another region would send them elsewhere, so
// only a DSN of the EU region is used. Localhost is the stand-in ingest of the
// check of what leaves the app (ADR 0016, e2e/egress.spec.ts). The host is
// read, not matched in the text: "https://k@evil.com/?x=.de.sentry.io" is not
// an EU DSN. A DSN that does not parse is off, and never an exception in the
// start of the server or of the page.
export function allowedSentryDsn(dsn: string | undefined): string | undefined {
  if (!dsn) return undefined;
  try {
    const { hostname } = new URL(dsn);
    return hostname.endsWith(EU_HOST_SUFFIX) || LOCAL_HOSTS.has(hostname)
      ? dsn
      : undefined;
  } catch {
    return undefined;
  }
}
