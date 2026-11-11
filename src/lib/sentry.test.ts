import {
  captureException,
  captureMessage,
  captureRequestError,
  flush,
  init,
} from "@sentry/nextjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SAFE_MESSAGE_TAG, scrubEvent } from "@/lib/sentry-scrub";
// The relative path: `@/lib/sentry` is the stub of vitest.shared.mts.
import {
  captureSafeError,
  flushSentry,
  initSentryClient,
  onRequestError,
  sentryBaseOptions,
} from "./sentry";

const { scope } = vi.hoisted(() => ({
  scope: { setTag: vi.fn(), setTags: vi.fn(), setUser: vi.fn() },
}));

// No `setUser` here: the user belongs to one event's scope, and a call to the
// global one would fail on the missing export.
vi.mock("@sentry/nextjs", () => ({
  init: vi.fn(),
  flush: vi.fn(async () => true),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  captureRequestError: vi.fn(),
  withScope: vi.fn((callback: (scope: unknown) => void) => callback(scope)),
}));

const DSN = "https://key@o1.ingest.de.sentry.io/2";

function initOptions() {
  const options = vi.mocked(init).mock.calls[0][0];
  if (!options) throw new Error("init was not called");
  return options;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sentryBaseOptions", () => {
  it("is on with a DSN of the EU region and takes its environment from the build", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "preview");

    expect(sentryBaseOptions(DSN)).toMatchObject({
      dsn: DSN,
      enabled: true,
      environment: "preview",
    });
  });

  it("is off with no DSN, and leaves the keys out instead of undefined", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_ENVIRONMENT", "");

    for (const dsn of [undefined, ""]) {
      const options = sentryBaseOptions(dsn);

      expect(options.enabled).toBe(false);
      // `{ environment: undefined }` would override the SDK's own default.
      expect(options).not.toHaveProperty("dsn");
      expect(options).not.toHaveProperty("environment");
    }
  });

  it.each([
    ["a US organization", "https://k@o1.ingest.us.sentry.io/2"],
    ["the old global host", "https://k@o1.ingest.sentry.io/2"],
    ["a string that is no URL", "not a dsn"],
    [
      "the EU host as a prefix of another",
      "https://k@o1.ingest.de.sentry.io.evil.com/2",
    ],
    ["the EU host in the query", "https://k@evil.com/?x=.de.sentry.io"],
    ["the EU host in the fragment", "https://k@evil.com#.de.sentry.io"],
  ])("is off for %s, which would send the events out of the EU", (_, dsn) => {
    const options = sentryBaseOptions(dsn);

    expect(options.enabled).toBe(false);
    expect(options).not.toHaveProperty("dsn");
  });

  it.each(["http://k@127.0.0.1:4399/1", "http://k@localhost:4399/1"])(
    "accepts %s, the stand-in ingest of the check of what leaves the app",
    (dsn) => {
      expect(sentryBaseOptions(dsn)).toMatchObject({ dsn, enabled: true });
    },
  );

  it("collects nothing optional and scrubs every event", () => {
    expect(sentryBaseOptions(DSN)).toMatchObject({
      maxBreadcrumbs: 0,
      sendClientReports: false,
      tracePropagationTargets: [],
      beforeSend: scrubEvent,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        databaseQueryData: false,
        stackFrameVariables: false,
        frameContextLines: 0,
      },
    });
  });
});

describe("initSentryClient", () => {
  it("keeps the integrations that report errors, and no others", () => {
    initSentryClient();
    const { integrations } = initOptions();
    const names = [
      "EventFilters",
      "FunctionToString",
      "BrowserApiErrors",
      "GlobalHandlers",
      "LinkedErrors",
      "Dedupe",
      "NextjsClientStackFrameNormalization",
      "BrowserSession",
      "Breadcrumbs",
      "Console",
      "HttpContext",
      "CultureContext",
      "BrowserTracing",
      "ConversationId",
    ];
    const defaults = names.map((name) => ({ name }));

    const kept = (integrations as (all: typeof defaults) => typeof defaults)(
      defaults,
    ).map(({ name }) => name);

    expect(kept).toEqual(names.slice(0, 7));
  });
});

describe("initSentryClient: the DSN and the filters of the browser", () => {
  it("uses the DSN that ships in the bundle", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
    vi.stubEnv("SENTRY_DSN", "https://server@o1.ingest.de.sentry.io/3");

    initSentryClient();

    expect(initOptions()).toMatchObject({ dsn: DSN, enabled: true });
  });

  it("drops the errors of scripts that a browser extension injects", () => {
    initSentryClient();
    const { denyUrls } = initOptions();
    const denied = (url: string) =>
      (denyUrls as RegExp[]).some((pattern) => pattern.test(url));

    expect(denied("chrome-extension://abcdef/content.js")).toBe(true);
    expect(denied("moz-extension://abcdef/content.js")).toBe(true);
    expect(denied("safari-web-extension://abcdef/content.js")).toBe(true);
    expect(denied("https://devstash.test/_next/static/chunk.js")).toBe(false);
  });
});

describe("captureSafeError", () => {
  it("sends a stand-in with our message, marked safe, for the user", () => {
    const failure = Object.assign(new Error("quoted alice@example.com"), {
      name: "PrismaClientKnownRequestError",
    });

    captureSafeError(failure, "Creating the item failed", {
      userId: "u1",
      ids: { itemId: "i1" },
    });

    expect(scope.setTag).toHaveBeenCalledWith(SAFE_MESSAGE_TAG, "1");
    expect(scope.setTags).toHaveBeenCalledWith({ itemId: "i1" });
    expect(scope.setUser).toHaveBeenCalledWith({ id: "u1" });
    const [sent] = vi.mocked(captureException).mock.calls[0];
    expect(sent).toBeInstanceOf(Error);
    expect(sent).toMatchObject({
      name: "PrismaClientKnownRequestError",
      message: "Creating the item failed",
    });
  });

  it("sets no user when there is none", () => {
    captureSafeError(new Error("x"), "Saving failed");

    expect(scope.setUser).not.toHaveBeenCalled();
  });

  it("sends a message when there is no error", () => {
    captureSafeError(undefined, "The index is empty");

    expect(captureException).not.toHaveBeenCalled();
    expect(captureMessage).toHaveBeenCalledWith("The index is empty", "error");
  });
});

describe("onRequestError", () => {
  const context = {
    routerKind: "App Router",
    routePath: "/(app)/items/[id]/page",
    routeType: "render",
  };
  const request = {
    path: "/reset-password?token=TOKEN123&email=alice@example.com",
    method: "GET",
    headers: { cookie: "authjs.session-token=COOKIE123" },
  };

  it("hands the SDK a stand-in, no query string and no headers", () => {
    const failure = Object.assign(new Error("quoted alice@example.com"), {
      digest: "1234567890",
    });

    onRequestError(failure, request, context);

    const [sent, sentRequest, sentContext] =
      vi.mocked(captureRequestError).mock.calls[0];
    expect(sent).toMatchObject({
      message: "Unhandled error in render of /(app)/items/[id]/page",
    });
    expect(sentRequest).toEqual({
      path: "/reset-password",
      method: "GET",
      headers: {},
    });
    expect(sentContext).toBe(context);
  });

  it("tags the event with the digest the error page shows", () => {
    onRequestError(
      Object.assign(new Error("x"), { digest: "1234567890" }),
      request,
      context,
    );

    expect(scope.setTag).toHaveBeenCalledWith(SAFE_MESSAGE_TAG, "1");
    expect(scope.setTag).toHaveBeenCalledWith("digest", "1234567890");
  });

  it("sets no digest tag for an error that has none", () => {
    onRequestError(new Error("x"), request, context);

    expect(scope.setTag).not.toHaveBeenCalledWith("digest", expect.anything());
  });
});

describe("flushSentry", () => {
  it("waits for the queue for two seconds at most", async () => {
    await flushSentry();

    expect(flush).toHaveBeenCalledWith(2000);
  });
});
