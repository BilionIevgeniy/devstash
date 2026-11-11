import {
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "openai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { parse, stream } = vi.hoisted(() => ({
  parse: vi.fn(),
  stream: vi.fn(),
}));

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  return {
    ...actual,
    default: class {
      responses = { parse, stream };
    },
  };
});

import {
  aiErrorKind,
  AiOutputError,
  generateStructured,
  streamText,
} from "@/lib/openai";
import { sha256Hex } from "@/lib/hash";

const schema = z.object({ tags: z.array(z.string()) });

const request = {
  operation: "auto-tags",
  model: "gpt-6-luna",
  instructions: "Suggest tags.",
  input: "<item>useAuth</item>",
  schema,
  schemaName: "tag_suggestions",
  effort: "none",
  verbosity: "low",
  maxOutputTokens: 300,
  timeoutMs: 10_000,
  userId: "user-1",
} as const;

const usage = {
  input_tokens: 800,
  output_tokens: 40,
  output_tokens_details: { reasoning_tokens: 0 },
};

function answer(fields: Record<string, unknown>) {
  return {
    status: "completed",
    incomplete_details: null,
    output: [],
    output_parsed: null,
    usage,
    ...fields,
  };
}

function headers() {
  return new Headers();
}

describe("generateStructured", () => {
  beforeEach(() => {
    parse.mockReset();
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the parsed answer", async () => {
    parse.mockResolvedValue(answer({ output_parsed: { tags: ["react"] } }));

    await expect(generateStructured(request)).resolves.toEqual({
      tags: ["react"],
    });
  });

  it("never lets OpenAI keep the response, and names the user by hash", async () => {
    parse.mockResolvedValue(answer({ output_parsed: { tags: [] } }));

    await generateStructured(request);

    const [body, options] = parse.mock.calls[0];
    expect(body).toMatchObject({
      store: false,
      safety_identifier: sha256Hex("user-1"),
      max_output_tokens: 300,
      reasoning: { effort: "none" },
    });
    expect(body).not.toHaveProperty("temperature");
    expect(body.safety_identifier).not.toContain("user-1");
    expect(options).toEqual({ timeout: 10_000 });
  });

  it("throws on an answer cut short", async () => {
    parse.mockResolvedValue(
      answer({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
      }),
    );

    await expect(generateStructured(request)).rejects.toMatchObject({
      reason: "max_output_tokens",
    });
  });

  it("throws on a refusal", async () => {
    parse.mockResolvedValue(
      answer({
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "I can't help with that." }],
          },
        ],
      }),
    );

    await expect(generateStructured(request)).rejects.toMatchObject({
      reason: "refusal",
    });
  });

  it("throws on an empty answer", async () => {
    parse.mockResolvedValue(answer({}));

    await expect(generateStructured(request)).rejects.toMatchObject({
      reason: "empty",
    });
  });

  it("turns an answer in the wrong shape into an output error", async () => {
    parse.mockRejectedValue(new z.ZodError([]));

    await expect(generateStructured(request)).rejects.toMatchObject({
      reason: "parse_failed",
    });
  });

  it("lets the SDK's errors through", async () => {
    const error = new RateLimitError(429, {}, "Slow down", headers());
    parse.mockRejectedValue(error);

    await expect(generateStructured(request)).rejects.toBe(error);
  });
});

describe("aiErrorKind", () => {
  it.each([
    ["credit_balance_exhausted"],
    ["project_spend_limit_exceeded"],
    ["organization_spend_limit_exceeded"],
  ])("takes the 429 %s for an outage only we can fix", (code) => {
    const error = new RateLimitError(429, { code }, "Limit", headers());

    expect(aiErrorKind(error)).toBe("unavailable");
  });

  it("takes an insufficient_quota type for an outage too", () => {
    const error = new RateLimitError(
      429,
      { type: "insufficient_quota" },
      "Quota",
      headers(),
    );

    expect(aiErrorKind(error)).toBe("unavailable");
  });

  it("takes a plain 429 for a busy service", () => {
    const error = new RateLimitError(429, {}, "Slow down", headers());

    expect(aiErrorKind(error)).toBe("busy");
  });

  it.each([
    ["a timeout", new APIConnectionTimeoutError(), "timeout"],
    [
      "a bad key",
      new AuthenticationError(401, {}, "Bad key", headers()),
      "unavailable",
    ],
    [
      "a server error",
      new InternalServerError(503, {}, "Down", headers()),
      "busy",
    ],
    ["a lost connection", new APIConnectionError({ message: "Reset" }), "busy"],
    ["a refusal", new AiOutputError("refusal"), "refused"],
    ["a filtered answer", new AiOutputError("content_filter"), "refused"],
    ["an answer cut short", new AiOutputError("max_output_tokens"), "failed"],
  ])("classifies %s", (_name, error, kind) => {
    expect(aiErrorKind(error)).toBe(kind);
  });

  it("knows nothing of other errors", () => {
    expect(aiErrorKind(new Error("Upstash is down"))).toBeNull();
  });
});

describe("streamText", () => {
  const streamRequest = {
    operation: "explain",
    model: "gpt-6-luna",
    instructions: "Explain the code.",
    input: "<item>useAuth</item>",
    effort: "low",
    verbosity: "medium",
    maxOutputTokens: 2_000,
    connectTimeoutMs: 15_000,
    userId: "user-1",
    signal: new AbortController().signal,
  } as const;

  function events(...list: Record<string, unknown>[]) {
    return (async function* () {
      yield* list;
    })();
  }

  async function collect(): Promise<string[]> {
    const chunks: string[] = [];
    for await (const chunk of streamText(streamRequest)) chunks.push(chunk);
    return chunks;
  }

  const completed = { type: "response.completed", response: { usage } };

  beforeEach(() => {
    stream.mockReset();
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("yields the text as it is written", async () => {
    stream.mockReturnValue(
      events(
        { type: "response.output_text.delta", delta: "It " },
        { type: "response.output_text.delta", delta: "reads." },
        completed,
      ),
    );

    await expect(collect()).resolves.toEqual(["It ", "reads."]);
  });

  it("never lets OpenAI keep the response, names the user by hash and passes the signal", async () => {
    stream.mockReturnValue(
      events({ type: "response.output_text.delta", delta: "x" }, completed),
    );

    await collect();

    const [body, options] = stream.mock.calls[0];
    expect(body).toMatchObject({
      store: false,
      safety_identifier: sha256Hex("user-1"),
      max_output_tokens: 2_000,
      reasoning: { effort: "low" },
      text: { verbosity: "medium" },
    });
    expect(options).toEqual({
      signal: streamRequest.signal,
      timeout: 15_000,
    });
  });

  it.each([
    [
      "an answer cut short",
      {
        type: "response.incomplete",
        response: {
          usage,
          incomplete_details: { reason: "max_output_tokens" },
        },
      },
      "max_output_tokens",
    ],
    ["a failed answer", { type: "response.failed", response: {} }, "other"],
    ["an error event", { type: "error", message: "boom" }, "other"],
    ["a refusal", { type: "response.refusal.delta", delta: "No." }, "refusal"],
  ])("throws on %s, after the text before it", async (_, event, reason) => {
    stream.mockReturnValue(
      events({ type: "response.output_text.delta", delta: "It " }, event),
    );
    const chunks: string[] = [];

    const reading = (async () => {
      for await (const chunk of streamText(streamRequest)) chunks.push(chunk);
    })();

    await expect(reading).rejects.toMatchObject({ reason });
    expect(chunks).toEqual(["It "]);
  });

  it("throws on an answer with no text", async () => {
    stream.mockReturnValue(events(completed));

    await expect(collect()).rejects.toMatchObject({
      name: "AiOutputError",
      reason: "empty",
    });
  });
});
