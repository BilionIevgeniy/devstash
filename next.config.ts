import type { NextConfig } from "next";

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
  env: { NEXT_PUBLIC_MONACO_VS_PATH: `${MONACO_PATH}/vs` },
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

export default nextConfig;
