// Pages that are never indexed, sent as `X-Robots-Tag: noindex, nofollow` by
// next.config.ts: the app behind sign-in and the auth pages, whose links can
// carry a token. A header, because the robots metadata of their dynamic
// layouts streams into the body, where a crawler that reads only the HTML head
// never sees it. Every prefix of the matcher in src/proxy.ts must be here
// (noindex-paths.test.ts); the matcher itself has to stay a literal.
export const NOINDEX_PATHS = [
  "/dashboard",
  "/profile",
  "/settings",
  "/items",
  "/collections",
  "/favorites",
  "/pinned",
  "/upgrade",
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
