import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit, flushSentry, getEntitlements, streamText } =
  vi.hoisted(() => ({
    consumeRateLimit: vi.fn(),
    flushSentry: vi.fn(async () => {}),
    getEntitlements: vi.fn(),
    streamText: vi.fn(),
  }));
vi.mock("@/lib/sentry", () => ({ captureSafeError: vi.fn(), flushSentry }));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/lib/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/openai")>()),
  streamText,
}));

import {
  AI_FAILURE_MESSAGES,
  AI_PRO_ONLY_MESSAGE,
} from "@/features/ai/domain/messages";
import { EXPLAIN_SETTINGS } from "@/features/ai/domain/model";
import { STREAM_END_MARK } from "@/features/ai/domain/text-stream";
import {
  startTextStream,
  type TextStreamOperation,
} from "@/features/ai/services/text-stream";
import { AiOutputError } from "@/lib/openai";

const allowed = { success: true, remaining: 10, reset: Date.now() };
const request: TextStreamOperation = {
  operation: "test",
  label: "Testing",
  settings: EXPLAIN_SETTINGS,
  instructions: "Answer.",
  input: "<item>x</item>",
};

// The text of a stream, the way the browser reads it.
async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

// Rejects as the SDK does once the call's signal aborts.
function abortOf(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")), {
      once: true,
    });
  });
}

function sentSignal(): AbortSignal {
  return streamText.mock.calls[0][0].signal;
}

describe("startTextStream", () => {
  let client: AbortController;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    getEntitlements.mockResolvedValue({ isPro: true });
    consumeRateLimit.mockResolvedValue(allowed);
    client = new AbortController();
    streamText.mockImplementation(async function* () {
      yield "It ";
      yield "lists files.";
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("streams the answer and ends it with the end mark", async () => {
    const result = await startTextStream("user-1", request, client.signal);

    if (result.status !== "ok") throw new Error(result.status);
    await expect(readAll(result.stream)).resolves.toBe(
      `It lists files.${STREAM_END_MARK}`,
    );
  });

  it("sends the operation's settings, instructions and input", async () => {
    await startTextStream("user-1", request, client.signal);

    expect(streamText.mock.calls[0][0]).toMatchObject({
      operation: "test",
      instructions: "Answer.",
      input: "<item>x</item>",
      maxOutputTokens: EXPLAIN_SETTINGS.maxOutputTokens,
      userId: "user-1",
    });
  });

  it("refuses a Free user before any OpenAI call", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(
      startTextStream("user-1", request, client.signal),
    ).resolves.toEqual({
      status: "refused",
      reason: "not-pro",
      error: AI_PRO_ONLY_MESSAGE,
    });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("refuses a user past a limit before any OpenAI call", async () => {
    consumeRateLimit.mockResolvedValue({ ...allowed, success: false });

    await expect(
      startTextStream("user-1", request, client.signal),
    ).resolves.toMatchObject({ status: "refused", reason: "limited" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("answers a failure before any text in plain words", async () => {
    streamText.mockImplementation(async function* () {
      yield* [];
      throw new AiOutputError("refusal");
    });

    await expect(
      startTextStream("user-1", request, client.signal),
    ).resolves.toEqual({
      status: "failed",
      error: AI_FAILURE_MESSAGES.refused,
    });
  });

  it("treats an empty answer as a failure", async () => {
    streamText.mockImplementation(async function* () {
      yield* [];
    });

    await expect(
      startTextStream("user-1", request, client.signal),
    ).resolves.toMatchObject({ status: "failed" });
  });

  it("throws an unknown failure before any text to the route", async () => {
    streamText.mockImplementation(async function* () {
      yield* [];
      throw new TypeError("bug");
    });

    await expect(
      startTextStream("user-1", request, client.signal),
    ).rejects.toThrow("bug");
  });

  it("stops quietly when the client goes away before any text", async () => {
    streamText.mockImplementation(async function* ({ signal }) {
      yield await abortOf(signal);
    });

    const result = startTextStream("user-1", request, client.signal);
    await vi.waitFor(() => expect(streamText).toHaveBeenCalled());
    client.abort();

    await expect(result).resolves.toEqual({ status: "aborted" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("gives up when no text comes in time", async () => {
    vi.useFakeTimers();
    streamText.mockImplementation(async function* ({ signal }) {
      yield await abortOf(signal);
    });

    const result = startTextStream("user-1", request, client.signal);
    await vi.waitFor(() => expect(streamText).toHaveBeenCalled());
    await vi.advanceTimersByTimeAsync(EXPLAIN_SETTINGS.firstTextMs);

    await expect(result).resolves.toEqual({
      status: "failed",
      error: AI_FAILURE_MESSAGES.timeout,
    });
  });

  it("ends the stream with an error when the answer stops midway", async () => {
    streamText.mockImplementation(async function* () {
      yield "It ";
      throw new AiOutputError("max_output_tokens");
    });

    const result = await startTextStream("user-1", request, client.signal);

    if (result.status !== "ok") throw new Error(result.status);
    await expect(readAll(result.stream)).rejects.toThrow();
  });

  it("logs a failure midway before it ends the stream, while the function is still running", async () => {
    const flushed = Promise.withResolvers<void>();
    flushSentry.mockReturnValueOnce(flushed.promise);
    streamText.mockImplementation(async function* () {
      yield "It ";
      throw new AiOutputError("max_output_tokens");
    });
    const result = await startTextStream(
      "user-1",
      { ...request, label: "Ordering" },
      client.signal,
    );
    if (result.status !== "ok") throw new Error(result.status);

    let ended = false;
    const reading = readAll(result.stream).catch(() => {
      ended = true;
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(flushSentry).toHaveBeenCalledOnce();
    expect(ended).toBe(false);

    flushed.resolve();
    await reading;
    expect(ended).toBe(true);
  });

  it("stops the OpenAI call when the stream is cancelled", async () => {
    streamText.mockImplementation(async function* ({ signal }) {
      yield "It ";
      yield await abortOf(signal);
    });

    const result = await startTextStream("user-1", request, client.signal);

    if (result.status !== "ok") throw new Error(result.status);
    await result.stream.cancel();
    expect(sentSignal().aborted).toBe(true);
  });
});
