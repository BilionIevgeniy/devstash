import "server-only";

const DEV_APP_ORIGIN = "http://localhost:3000";

// Links in emails carry secret tokens, so the origin comes from configuration
// and never from request headers, which a client can forge.
export function getAppOrigin(): string {
  const configured = process.env.APP_URL;
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV !== "production") return DEV_APP_ORIGIN;
  throw new Error("APP_URL is not set");
}

// The origin of public links (canonical, hreflang), read at build time. It
// never throws: a build without APP_URL (a Vercel preview) still links to the
// production domain, which Vercel sets on every build, and a canonical link
// on a preview should point there anyway.
export function getSiteOrigin(): string {
  const configured = process.env.APP_URL;
  if (configured) return new URL(configured).origin;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return new URL(`https://${production}`).origin;
  return DEV_APP_ORIGIN;
}
