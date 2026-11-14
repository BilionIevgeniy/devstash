import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import packageJson from "./package.json";

// Where scripts/copy-monaco.mjs puts the editor. The exact version in the path
// is what lets the files be cached for good.
const MONACO_PATH = `/monaco/${packageJson.dependencies["monaco-editor"]}`;

// Sent with every response. The CSP covers framing, plugins and <base> only:
// a script and style policy needs nonces and room for Monaco's workers, R2 and
// GitHub avatars (deferred, see context/todo.md). HSTS goes out in production
// only and without includeSubDomains, which would bind every subdomain of a
// custom domain to HTTPS for two years.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
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
// Vercel build when the token is there. The runtime side is src/lib/sentry.ts.
// next-intl reads the request config from lib (ADR 0024): the locale of a
// render, its messages, formats and time zone.
const withNextIntl = createNextIntlPlugin("./src/lib/i18n-request.ts");

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
