import {
  APIConnectionError,
  APIConnectionTimeoutError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "openai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const parse = vi.hoisted(() => vi.fn());

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  return {
    ...actual,
    default: class {
      responses = { parse };
    },
  };
});

import {
  aiErrorKind,
  aiErrorSummary,
  AiOutputError,
  generateStructured,
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

describe("aiErrorSummary", () => {
  it("logs the status and codes of an OpenAI error, not its message", () => {
    const error = new RateLimitError(
      429,
      { code: "rate_limit_exceeded", message: "Your snippet: const key" },
      "Your snippet: const key",
      headers(),
    );

    const summary = aiErrorSummary(error);

    expect(summary).toContain("status=429");
    expect(summary).toContain("code=rate_limit_exceeded");
    expect(summary).not.toContain("snippet");
  });

  it("logs the reason of an output error", () => {
    expect(aiErrorSummary(new AiOutputError("empty"))).toBe("output=empty");
  });
});
