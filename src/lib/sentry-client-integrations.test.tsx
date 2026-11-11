import { close, getClient } from "@sentry/nextjs";
import { afterEach, describe, expect, it, vi } from "vitest";
// The relative path: `@/lib/sentry` is the stub of vitest.shared.mts.
import { initSentryClient } from "./sentry";

// The real SDK, in its browser build, not a mock: the list of names in
// lib/sentry.ts is applied to the list the Next.js SDK really builds, which has
// integrations of its own that the public `getDefaultIntegrations` does not
// return. A name that changes in a new version either drops a reporter (an
// error goes unreported) or lets an integration through that sends data on its
// own, and nothing else would see it (ADR 0016).
//
// Vitest resolves the package to its server build, because it does not set the
// `browser` condition of the package's export map, so the browser build is
// loaded by its path.
vi.mock("@sentry/nextjs", async () => {
  const { createRequire } = await import("node:module");
  const { dirname } = await import("node:path");
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve("@sentry/nextjs/package.json"));
  // The CommonJS build: the ES module one imports `next/router` without an
  // extension, which Node cannot resolve outside Next.js.
  return require(`${root}/build/cjs/index.client.js`);
});

afterEach(async () => {
  await close();
  vi.unstubAllEnvs();
});

describe("initSentryClient with the real SDK", () => {
  it("starts exactly the integrations that report errors", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://k@o1.ingest.de.sentry.io/2");

    initSentryClient();

    expect(getClient()?.getIntegrationNames().sort()).toEqual([
      "BrowserApiErrors",
      "Dedupe",
      "EventFilters",
      "FunctionToString",
      "GlobalHandlers",
      "LinkedErrors",
      "NextjsClientStackFrameNormalization",
    ]);
  });
});
