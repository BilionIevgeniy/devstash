import { httpIntegration, init } from "@sentry/nextjs";
import { type Integration, sentryBaseOptions } from "@/lib/sentry";

// The server half of the Sentry client, apart from lib/sentry.ts because the
// browser build of the SDK has no `httpIntegration` and the two halves share
// that file. Only src/instrumentation.ts imports it, on the Node.js runtime.

export function initSentryServer(): void {
  // The DSN of the browser ships in the page, so anyone can post events with
  // it, and a flood of them would use up the quota and the rate limit of that
  // key before a real error of the server arrives. The server has a key of its
  // own when SENTRY_DSN is set (a second client key of the same project, never
  // built into the bundle); without it, it falls back to the public one.
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  init({
    ...sentryBaseOptions(dsn),
    integrations: (integrations: Integration[]) => [
      // Without these two the SDK counts every request as a "session" and sends
      // the counts to Sentry once a minute, errors or not. Release health is
      // not used, and nothing should leave the server without an error.
      ...integrations.filter(
        ({ name }) => name !== "Http" && name !== "ProcessSession",
      ),
      // The replacement for the Http integration of the Next.js SDK, which
      // leaves the spans of incoming requests to Next.js itself.
      httpIntegration({ disableIncomingRequestSpans: true, sessions: false }),
    ],
  });
}
