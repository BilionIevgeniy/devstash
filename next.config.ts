import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import packageJson from "./package.json";
import { pageExtensionsFor } from "./scripts/e2e-build";
import { buildContentSecurityPolicy, CSP_HEADER } from "./src/lib/http/csp";
import { NOINDEX_PATHS } from "./src/lib/http/noindex-paths";

// Where scripts/copy-monaco.mjs puts the editor. The exact version in the path
// is what lets the files be cached for good.
const MONACO_PATH = `/monaco/${packageJson.dependencies["monaco-editor"]}`;

// The Content-Security-Policy (ADR 0036), built from the origins this build
// talks to. headers() is read at build time, so the values of the build's
// environment are the ones that ship.
const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy({
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  r2: {
    accountId: process.env.R2_ACCOUNT_ID,
    bucket: process.env.R2_BUCKET_NAME,
    endpoint: process.env.R2_ENDPOINT,
  },
  dev: process.env.NODE_ENV === "development",
});

// Sent with every response. The policy was report-only until the end-to-end
// suite ran green with it; e2e/support/test.ts fails a test on any violation.
// HSTS goes out in production only and without
// includeSubDomains, which would bind every subdomain of a custom domain to
// HTTPS for two years.
const SECURITY_HEADERS = [
  { key: CSP_HEADER, value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000" }]
    : []),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Static shells (ADR 0037): the marketing and legal pages are static and
  // stay so (ensureStatic), the app and auth layouts read the request and say
  // so (instant = false). Nothing per user is cached on the server.
  cacheComponents: true,
  // Off on purpose, measured (docs/performance.md): every app route reads the
  // session, so each link's App Shell is a server render with its database
  // reads, and a page view made about twice the queries for the same TTFB and
  // LCP. Next.js logs a warning for it; revisit with Next.js 17, or once the
  // app's layout no longer reads the request (ADR 0037).
  partialPrefetching: false,
  // The throw routes of the end-to-end build only (scripts/e2e-build.ts).
  pageExtensions: pageExtensionsFor({
    E2E_BUILD: process.env.E2E_BUILD,
    VERCEL: process.env.VERCEL,
  }),
  devIndicators: false,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_MONACO_VS_PATH: `${MONACO_PATH}/vs`,
    // Which deployment an event came from, in the server and in the browser
    // bundle alike (VERCEL_ENV itself is not in the browser). The alert for new
    // issues filters on production.
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.VERCEL_ENV ?? "development",
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      ...NOINDEX_PATHS.map((path) => ({
        source: `${path}/:path*`,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
      {
        source: `${MONACO_PATH}/:path*`,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

// The build side of Sentry. It reads SENTRY_ORG, SENTRY_PROJECT and
// SENTRY_AUTH_TOKEN from the environment, and uploads the source maps of the
// Vercel build when the token is there. The runtime side is src/lib/observability/sentry.ts.
// next-intl reads the request config from lib (ADR 0024): the locale of a
// render, its messages, formats and time zone.
const withNextIntl = createNextIntlPlugin("./src/lib/locale/i18n-request.ts");

export default withSentryConfig(withNextIntl(nextConfig), {
  telemetry: false,
  silent: !process.env.CI,
  // Tracing is not used and the SDK's debug logging is never switched on, so
  // their code stays out of the bundle every visitor downloads.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
  },
  sourcemaps: {
    // No token, no upload, and then no source maps at all: a build without the
    // token (CI, the end-to-end tests, a preview) has no .map file to serve.
    disable: !process.env.SENTRY_AUTH_TOKEN,
    // With the token the maps are uploaded and then deleted from the build.
    deleteSourcemapsAfterUpload: true,
  },
  // By default a failed upload stops the build. Readable stack traces are not
  // worth a failed deploy, so it warns and the deploy goes on.
  errorHandler: (error) => {
    console.warn(`Sentry: ${error.message}. The build goes on without it.`);
  },
});
