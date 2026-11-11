import type { ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { SAFE_MESSAGE_TAG, scrubEvent } from "@/lib/sentry-scrub";

// The shape of an event for a failed request, with everything the SDK or the
// error could carry that must not reach Sentry.
function leakyEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  return {
    type: undefined,
    event_id: "evt1",
    level: "error",
    environment: "production",
    release: "build-1",
    platform: "node",
    server_name: "ip-10-1-1-1.ec2.internal",
    transaction: "GET /reset-password?token=TOKEN123",
    request: {
      url: "https://devstash.test/reset-password?token=TOKEN123&email=alice@example.com#top",
      method: "GET",
      headers: { cookie: "authjs.session-token=COOKIE123", referer: "REFERER" },
      cookies: { "authjs.session-token": "COOKIE123" },
      data: { password: "hunter2" },
      query_string: "token=TOKEN123",
      env: { REMOTE_ADDR: "203.0.113.7" },
    },
    contexts: {
      nextjs: {
        request_path: "/reset-password?token=TOKEN123&email=alice@example.com",
        router_kind: "App Router",
        router_path: "/reset-password",
        route_type: "render",
      },
      browser: { name: "Chrome", version: "130" },
      culture: { timezone: "Europe/Berlin", locale: "de-DE" },
      trace: { trace_id: "t1", span_id: "s1" },
    },
    user: {
      id: "cuid1",
      email: "alice@example.com",
      ip_address: "203.0.113.7",
      username: "alice",
    },
    breadcrumbs: [{ message: "clicked Secret plan" }],
    extra: { title: "Secret plan" },
    modules: { prisma: "7.10.1" },
    exception: {
      values: [
        {
          type: "PrismaClientKnownRequestError",
          value:
            'Invalid invocation { title: "Secret plan" } alice@example.com',
          mechanism: {
            type: "auto.function.nextjs.on_request_error",
            handled: false,
            data: { detail: "alice@example.com" },
          },
          stacktrace: {
            frames: [
              {
                filename: "/app/src/item.ts?v=VERSION123",
                function: "createItem",
                lineno: 41,
                colno: 9,
                in_app: true,
                debug_id: "debug-1",
                vars: { password: "hunter2" },
                context_line: "const secret = 'SOURCE123'",
                pre_context: ["before SOURCE123"],
                post_context: ["after SOURCE123"],
              },
            ],
          },
        },
      ],
    },
    ...overrides,
  };
}

describe("scrubEvent", () => {
  it("lets nothing sensitive through", () => {
    const sent = JSON.stringify(scrubEvent(leakyEvent()));

    for (const secret of [
      "TOKEN123",
      "COOKIE123",
      "REFERER",
      "hunter2",
      "alice",
      "203.0.113.7",
      "Secret plan",
      "SOURCE123",
      "VERSION123",
      "ip-10-1-1-1",
      "Europe/Berlin",
      "7.10.1",
    ]) {
      expect(sent).not.toContain(secret);
    }
  });

  it("keeps what finds the failure: route, kind, class, frame, release", () => {
    const event = scrubEvent(leakyEvent());

    expect(event.transaction).toBe("GET /reset-password");
    expect(event.release).toBe("build-1");
    expect(event.environment).toBe("production");
    expect(event.contexts?.nextjs).toEqual({
      request_path: "/reset-password",
      router_kind: "App Router",
      router_path: "/reset-password",
      route_type: "render",
    });
    expect(event.contexts?.browser).toEqual({ name: "Chrome", version: "130" });
    expect(event.exception?.values?.[0]).toMatchObject({
      type: "PrismaClientKnownRequestError",
      mechanism: {
        type: "auto.function.nextjs.on_request_error",
        handled: false,
      },
      stacktrace: {
        frames: [
          {
            filename: "/app/src/item.ts",
            function: "createItem",
            lineno: 41,
            colno: 9,
            in_app: true,
            debug_id: "debug-1",
          },
        ],
      },
    });
  });

  it("reduces the request to its method and its URL without the query", () => {
    expect(scrubEvent(leakyEvent()).request).toEqual({
      method: "GET",
      url: "https://devstash.test/reset-password",
    });
  });

  it("reduces the user to the id", () => {
    expect(scrubEvent(leakyEvent()).user).toEqual({ id: "cuid1" });
    expect(
      scrubEvent(leakyEvent({ user: { email: "a@b.co" } })).user,
    ).toBeUndefined();
  });

  it("blanks the message of an event that is not marked safe", () => {
    const event = scrubEvent(leakyEvent());

    expect(event.exception?.values?.[0].value).toBeUndefined();
    expect(event.message).toBeUndefined();
  });

  it("keeps a message that the calling code wrote, without an email", () => {
    const marked = leakyEvent({
      tags: { [SAFE_MESSAGE_TAG]: "1", userId: "cuid1" },
      message: "Mail to alice@example.com failed",
      exception: {
        values: [{ type: "Error", value: "Creating the item failed" }],
      },
    });

    const event = scrubEvent(marked);

    expect(event.exception?.values?.[0].value).toBe("Creating the item failed");
    expect(event.message).toBe("Mail to [email] failed");
    expect(event.tags).toEqual({ userId: "cuid1" });
  });

  it("keeps tags that are text, numbers or flags and redacts emails in them", () => {
    const event = scrubEvent(
      leakyEvent({
        tags: {
          digest: "1234567890",
          status: 500,
          handled: false,
          owner: "alice@example.com",
          nothing: undefined,
        },
      }),
    );

    expect(event.tags).toEqual({
      digest: "1234567890",
      status: 500,
      handled: false,
      owner: "[email]",
    });
  });

  it("keeps the debug ids and the processing metadata the SDK needs", () => {
    const event = scrubEvent(
      leakyEvent({
        debug_meta: {
          images: [{ type: "sourcemap", code_file: "a.js", debug_id: "d1" }],
        },
        sdkProcessingMetadata: { dynamicSamplingContext: { trace_id: "t1" } },
      }),
    );

    expect(event.debug_meta?.images).toHaveLength(1);
    expect(event.sdkProcessingMetadata).toEqual({
      dynamicSamplingContext: { trace_id: "t1" },
    });
  });

  it("passes an event that has none of the optional parts", () => {
    expect(scrubEvent({ type: undefined, event_id: "evt2" })).toMatchObject({
      event_id: "evt2",
    });
  });
});
