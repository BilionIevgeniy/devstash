// Relative imports: next.config.ts loads this file, and its loader does not
// read the @/ alias of tsconfig.
import { allowedSentryDsn } from "../observability/sentry-dsn";
import { r2BrowserOrigin } from "../vendors/r2-endpoint";

// The Content-Security-Policy of every response (ADR 0036). It is a header
// built once at build time, so the static pages stay static: no nonce.
// App Router writes inline flight scripts on every page, so script-src keeps
// 'unsafe-inline' and an injected inline script still runs. What the policy
// does hold is where the page may send data and load from: exact origins,
// never a wildcard such as *.r2.cloudflarestorage.com, which would let a
// script upload to any bucket. A new origin is added here with its test.

export const CSP_HEADER = "Content-Security-Policy";

export interface CspInput {
  /** NEXT_PUBLIC_SENTRY_DSN: its origin is where the browser SDK posts. */
  sentryDsn: string | undefined;
  /** The R2 variables; no bucket means no uploads, and no R2 origin. */
  r2: {
    accountId: string | undefined;
    bucket: string | undefined;
    endpoint: string | undefined;
  };
  /** `next dev`: React's debugging needs eval, and HMR a WebSocket. */
  dev: boolean;
}

// GitHub avatars of the users who signed in with GitHub.
const GITHUB_AVATARS = "https://avatars.githubusercontent.com";

function sentryOrigin(dsn: string | undefined): string[] {
  const allowed = allowedSentryDsn(dsn);
  return allowed ? [new URL(allowed).origin] : [];
}

function r2Origin({ accountId, bucket, endpoint }: CspInput["r2"]): string[] {
  if (!accountId || !bucket) return [];
  return [r2BrowserOrigin(accountId, bucket, endpoint)];
}

export function cspDirectives(input: CspInput): Record<string, string[]> {
  const r2 = r2Origin(input.r2);
  return {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(input.dev ? ["'unsafe-eval'"] : []),
    ],
    // Monaco, Radix and Sonner set style attributes and inject <style> tags.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", ...r2, GITHUB_AVATARS],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...r2,
      ...sentryOrigin(input.sentryDsn),
      ...(input.dev ? ["ws:"] : []),
    ],
    // Monaco's workers, served from /monaco/ on this origin.
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
}

// No form-action: the GitHub sign-in is a Server Action that redirects to
// github.com, and Chrome applies form-action to that redirect.
export function buildContentSecurityPolicy(input: CspInput): string {
  return Object.entries(cspDirectives(input))
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}
