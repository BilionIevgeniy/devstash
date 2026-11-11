import { httpIntegration, init } from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sentryBaseOptions } from "@/lib/sentry";
import { initSentryServer } from "@/lib/sentry-server";

vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  httpIntegration: vi.fn((options: object) => ({ name: "Http", options })),
}));

// The base options are tested with lib/sentry.ts; here they are a marker.
vi.mock("@/lib/sentry", () => ({
  sentryBaseOptions: vi.fn(() => ({ enabled: true })),
}));

type Named = { name: string };

function integrationsOf(defaults: Named[]): Named[] {
  initSentryServer();
  const options = vi.mocked(init).mock.calls[0][0];
  const integrations = options?.integrations as (all: Named[]) => Named[];
  return integrations(defaults);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("initSentryServer", () => {
  it("starts the SDK with the options the server and the browser share", () => {
    initSentryServer();

    expect(init).toHaveBeenCalledOnce();
    expect(vi.mocked(init).mock.calls[0][0]).toMatchObject({ enabled: true });
  });

  it("reports through the key of its own when SENTRY_DSN is set", () => {
    vi.stubEnv("SENTRY_DSN", "https://server@o1.ingest.de.sentry.io/3");
    vi.stubEnv(
      "NEXT_PUBLIC_SENTRY_DSN",
      "https://public@o1.ingest.de.sentry.io/2",
    );

    initSentryServer();

    expect(sentryBaseOptions).toHaveBeenCalledExactlyOnceWith(
      "https://server@o1.ingest.de.sentry.io/3",
    );
  });

  it("falls back to the public key when SENTRY_DSN is unset or empty", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SENTRY_DSN",
      "https://public@o1.ingest.de.sentry.io/2",
    );

    for (const empty of [undefined, ""]) {
      vi.mocked(sentryBaseOptions).mockClear();
      vi.stubEnv("SENTRY_DSN", empty);

      initSentryServer();

      expect(sentryBaseOptions).toHaveBeenCalledExactlyOnceWith(
        "https://public@o1.ingest.de.sentry.io/2",
      );
    }
  });

  it("drops the integrations that count requests as sessions", () => {
    const names = integrationsOf([
      { name: "Dedupe" },
      { name: "Http" },
      { name: "ProcessSession" },
      { name: "LinkedErrors" },
    ]).map(({ name }) => name);

    // `Http` comes back once, as the replacement that has sessions off.
    expect(names).toEqual(["Dedupe", "LinkedErrors", "Http"]);
    expect(names).not.toContain("ProcessSession");
  });

  it("replaces Http by one with no sessions and no incoming-request spans", () => {
    integrationsOf([{ name: "Http" }]);

    expect(httpIntegration).toHaveBeenCalledExactlyOnceWith({
      disableIncomingRequestSpans: true,
      sessions: false,
    });
  });
});
