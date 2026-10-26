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
