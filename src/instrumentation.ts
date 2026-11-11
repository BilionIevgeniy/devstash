// Next.js calls `register` once when a server instance starts, and
// `onRequestError` for every error nobody caught in a Server Component, a Route
// Handler or a Server Action (file conventions in the Next.js docs,
// instrumentation). The work is in lib/sentry.ts. Only the Node.js runtime is
// started: no route sets `runtime = "edge"` and the proxy runs on Node.js.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { initSentryServer } = await import("@/lib/sentry-server");
  initSentryServer();
}

export { onRequestError } from "@/lib/sentry";
