import { initSentryClient } from "@/lib/observability/sentry";

// Runs in the browser after the HTML is loaded and before React hydrates. Only
// synchronous top-level code is certain to finish by then, which is why the
// SDK is a static import here and not loaded on demand.
initSentryClient();
