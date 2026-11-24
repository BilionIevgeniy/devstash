import { config as configureZod } from "zod";
import { initSentryClient } from "@/lib/observability/sentry";

// Runs in the browser after the HTML is loaded and before React hydrates. Only
// synchronous top-level code is certain to finish by then, which is why the
// SDK is a static import here and not loaded on demand.
initSentryClient();

// The Content-Security-Policy allows no eval (ADR 0036). Zod compiles its
// object schemas with `new Function` once it has found eval allowed, and finds
// that out by trying it: the browser reports that attempt as a violation even
// though Zod catches it. Without the JIT it parses the same, a little slower;
// the server keeps it.
configureZod({ jitless: true });
