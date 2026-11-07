import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consumeRateLimit, getEntitlements, streamText } = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  getEntitlements: vi.fn(),
  streamText: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({ consumeRateLimit }));
vi.mock("@/features/billing/queries", () => ({ getEntitlements }));
vi.mock("@/lib/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/openai")>()),
  streamText,
}));

import { STREAM_END_MARK } from "@/features/ai/domain/explain";
import { EXPLAIN_CODE_MAX } from "@/features/ai/domain/input";
import {
  AI_FAILURE_MESSAGES,
  AI_PRO_ONLY_MESSAGE,
} from "@/features/ai/domain/messages";
import { EXPLAIN_SETTINGS } from "@/features/ai/domain/model";
import { startExplanation } from "@/features/ai/services/explain";
import { AiOutputError } from "@/lib/openai";

const allowed = { success: true, remaining: 10, reset: Date.now() };
const input = { title: "useAuth", language: "bash", code: "ls -la" };

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

describe("startExplanation", () => {
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
    const result = await startExplanation("user-1", input, client.signal);

    if (result.status !== "ok") throw new Error(result.status);
    await expect(readAll(result.stream)).resolves.toBe(
      `It lists files.${STREAM_END_MARK}`,
    );
  });

  it("names the language and sends only the start of long code", async () => {
    await startExplanation(
      "user-1",
      { ...input, code: "c".repeat(EXPLAIN_CODE_MAX + 50) },
      client.signal,
    );

    const { input: sent } = streamText.mock.calls[0][0];
    expect(sent).toContain("useAuth (Shell)");
    expect(sent).toContain("c".repeat(EXPLAIN_CODE_MAX));
    expect(sent).not.toContain("c".repeat(EXPLAIN_CODE_MAX + 1));
  });

  it("refuses a Free user before any OpenAI call", async () => {
    getEntitlements.mockResolvedValue({ isPro: false });

    await expect(
      startExplanation("user-1", input, client.signal),
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
      startExplanation("user-1", input, client.signal),
    ).resolves.toMatchObject({ status: "refused", reason: "limited" });
    expect(streamText).not.toHaveBeenCalled();
  });

  it("answers a failure before any text in plain words", async () => {
    streamText.mockImplementation(async function* () {
      yield* [];
      throw new AiOutputError("refusal");
    });

    await expect(
      startExplanation("user-1", input, client.signal),
    ).resolves.toEqual({
      status: "failed",
      error: AI_FAILURE_MESSAGES.refused,
    });
  });

  it("throws an unknown failure before any text to the route", async () => {
    streamText.mockImplementation(async function* () {
      yield* [];
      throw new TypeError("bug");
    });

    await expect(
      startExplanation("user-1", input, client.signal),
    ).rejects.toThrow("bug");
  });

  it("stops quietly when the client goes away before any text", async () => {
    streamText.mockImplementation(async function* ({ signal }) {
      yield await abortOf(signal);
    });

    const result = startExplanation("user-1", input, client.signal);
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

    const result = startExplanation("user-1", input, client.signal);
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

    const result = await startExplanation("user-1", input, client.signal);

    if (result.status !== "ok") throw new Error(result.status);
    await expect(readAll(result.stream)).rejects.toThrow();
  });

  it("stops the OpenAI call when the stream is cancelled", async () => {
    streamText.mockImplementation(async function* ({ signal }) {
      yield "It ";
      yield await abortOf(signal);
    });

    const result = await startExplanation("user-1", input, client.signal);

    if (result.status !== "ok") throw new Error(result.status);
    await result.stream.cancel();
    expect(sentSignal().aborted).toBe(true);
  });
});
