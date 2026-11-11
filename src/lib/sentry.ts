import {
  type getDefaultIntegrations,
  captureException,
  captureMessage,
  captureRequestError,
  flush,
  init,
  withScope,
} from "@sentry/nextjs";
import { errorDigest, safeError } from "@/lib/error-summary";
import { SAFE_MESSAGE_TAG, scrubEvent, stripQuery } from "@/lib/sentry-scrub";

// The vendor client for Sentry (with next.config.ts, which wraps the build, the
// only place the SDK is imported). What leaves the app is decided in three
// layers: `dataCollection` below tells the SDK to collect nothing optional,
// `scrubEvent` rebuilds every event from a list of safe fields, and the
// capture functions here only ever hand it an error whose message the calling
// code wrote. With no DSN the SDK is off, so development needs no account.

type InitOptions = NonNullable<Parameters<typeof init>[0]>;
// The package does not export the type itself.
export type Integration = ReturnType<typeof getDefaultIntegrations>[number];
type RequestInfo = Parameters<typeof captureRequestError>[1];
type ErrorContext = Parameters<typeof captureRequestError>[2];

const FLUSH_TIMEOUT_MS = 2000;

// The browser reports through these and nothing else. The list is of names, so
// a name that changes in a new SDK version drops its integration (an error
// goes unreported, no data leaks); sentry-client-integrations.test.tsx runs the
// real SDK against this list, so an upgrade that renames one fails CI. Not
// here, on purpose: BrowserSession (a ping on every page view), Breadcrumbs,
// Console, HttpContext, CultureContext (timezone and locale), BrowserTracing,
// ConversationId.
const CLIENT_INTEGRATIONS = new Set([
  "EventFilters",
  "FunctionToString",
  "BrowserApiErrors",
  "GlobalHandlers",
  "LinkedErrors",
  "Dedupe",
  // Maps the frames of the bundles to the files that the source maps describe.
  "NextjsClientStackFrameNormalization",
]);

// Scripts that a browser extension injects: their errors are not ours to fix,
// and a frame from one names an extension the visitor has installed.
const EXTENSION_URLS = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari(-web)?-extension:\/\//i,
];

const EU_HOST_SUFFIX = ".de.sentry.io";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

// The privacy notice says the events stay in Sentry's EU region, and a DSN
// pasted from an organization in another region would send them elsewhere, so
// only a DSN of the EU region is used. Localhost is the stand-in ingest of the
// check of what leaves the app (ADR 0016). The host is read, not matched in the
// text: "https://k@evil.com/?x=.de.sentry.io" is not an EU DSN. A DSN that does
// not parse is off, and never an exception in the start of the server or of
// the page.
function isAllowedDsn(dsn: string): boolean {
  try {
    const { hostname } = new URL(dsn);
    return hostname.endsWith(EU_HOST_SUFFIX) || LOCAL_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

// What the server and the browser have in common. lib/sentry-server.ts adds the
// part that only exists on the server.
export function sentryBaseOptions(dsn: string | undefined): InitOptions {
  const allowed = dsn && isAllowedDsn(dsn) ? dsn : undefined;
  const environment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;
  // A key that is present but undefined would override the SDK's own default
  // when the options are spread, so absent values are left out.
  return {
    ...(allowed && { dsn: allowed }),
    ...(environment && { environment }),
    enabled: Boolean(allowed),
    // Click, fetch and console breadcrumbs carry item titles and presigned URLs.
    maxBreadcrumbs: 0,
    sendClientReports: false,
    // The SDK adds trace headers to every outgoing server request by default:
    // Stripe, OpenAI, Resend, R2 and Upstash get none of them.
    tracePropagationTargets: [],
    // Version 11 has no sendDefaultPii; this option replaces it and its
    // defaults collect cookies, headers, bodies, query strings and the
    // variables of every stack frame.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    },
    beforeSend: scrubEvent,
  };
}

export function initSentryClient(): void {
  init({
    ...sentryBaseOptions(process.env.NEXT_PUBLIC_SENTRY_DSN),
    denyUrls: EXTENSION_URLS,
    integrations: (integrations: Integration[]) =>
      integrations.filter(({ name }) => CLIENT_INTEGRATIONS.has(name)),
  });
}

export interface CaptureContext {
  /** Becomes `user.id` of this event only, never of the next one. */
  userId?: string;
  /** Other ids (item, collection), sent as tags. */
  ids?: Record<string, string>;
}

// Reports a caught error with a message the calling code wrote. The error
// itself gives only its class name and its frames (`safeError`).
export function captureSafeError(
  error: unknown,
  message: string,
  { userId, ids = {} }: CaptureContext = {},
): void {
  withScope((scope) => {
    scope.setTag(SAFE_MESSAGE_TAG, "1");
    scope.setTags(ids);
    if (userId) scope.setUser({ id: userId });
    if (error === undefined) captureMessage(message, "error");
    else captureException(safeError(error, message));
  });
}

// `onRequestError` of Next.js: an error nobody caught, in a Server Component,
// a Route Handler or a Server Action. The SDK flushes this one itself. It gets
// the path without its query string and no headers, and the digest as a tag, so
// the reference an error page shows finds the event.
export function onRequestError(
  error: unknown,
  request: RequestInfo,
  context: ErrorContext,
): void {
  const digest = errorDigest(error);
  withScope((scope) => {
    scope.setTag(SAFE_MESSAGE_TAG, "1");
    if (digest) scope.setTag("digest", digest);
    captureRequestError(
      safeError(
        error,
        `Unhandled error in ${context.routeType} of ${context.routePath}`,
      ),
      { path: stripQuery(request.path), method: request.method, headers: {} },
      context,
    );
  });
}

// A serverless function can freeze once it has answered, with the event still
// queued: callers that answer right after logging await this first.
export async function flushSentry(): Promise<void> {
  await flush(FLUSH_TIMEOUT_MS);
}
