import "server-only";

import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  AuthenticationError,
  InternalServerError,
  OpenAIError,
  PermissionDeniedError,
  RateLimitError,
} from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ResponseUsage } from "openai/resources/responses/responses";
import { ZodError, type ZodType } from "zod";

import { sha256Hex } from "@/lib/hash";

export type AiEffort = "none" | "low";
export type AiVerbosity = "low" | "medium";

/** What a failed call means for the user; null when it means nothing specific. */
export type AiErrorKind =
  "busy" | "unavailable" | "timeout" | "refused" | "failed";

export type AiOutputReason =
  | "max_output_tokens"
  | "content_filter"
  | "refusal"
  | "empty"
  | "parse_failed"
  | "other";

// The model answered, but with nothing usable: cut short, filtered, refused,
// or not in the requested shape.
export class AiOutputError extends Error {
  readonly reason: AiOutputReason;

  constructor(reason: AiOutputReason, options?: ErrorOptions) {
    super(`The model gave no usable output (${reason})`, options);
    this.name = "AiOutputError";
    this.reason = reason;
  }
}

export interface StructuredRequest<T> {
  /** A short name for the logs, such as "auto-tags". */
  operation: string;
  model: string;
  instructions: string;
  input: string;
  schema: ZodType<T>;
  schemaName: string;
  effort: AiEffort;
  verbosity: AiVerbosity;
  maxOutputTokens: number;
  /** Per attempt; the client retries once, so the worst case is about twice. */
  timeoutMs: number;
  userId: string;
}

export interface TextStreamRequest {
  /** A short name for the logs, such as "explain". */
  operation: string;
  model: string;
  instructions: string;
  input: string;
  effort: AiEffort;
  verbosity: AiVerbosity;
  maxOutputTokens: number;
  /**
   * Until the response headers only: OpenAI sends them at once, so this does
   * not bound the wait for text. Bound that with `signal`.
   */
  connectTimeoutMs: number;
  userId: string;
  /** Aborts the call: the caller's deadlines and the client going away. */
  signal: AbortSignal;
}

// 429 codes that a retry cannot fix: only we can, by adding credit or raising
// the limit.
const SPEND_ERROR_CODES = new Set([
  "insufficient_quota",
  "credit_balance_exhausted",
  "organization_spend_limit_exceeded",
  "project_spend_limit_exceeded",
]);

let client: OpenAI | undefined;

// Created on first use so a build never needs the key. The SDK's default
// timeout is 10 minutes, far past what a user waits or a function lives.
function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
  return client;
}

function toOutputReason(reason: string | undefined): AiOutputReason {
  return reason === "max_output_tokens" || reason === "content_filter"
    ? reason
    : "other";
}

function logUsage(
  operation: string,
  model: string,
  usage: ResponseUsage | undefined,
) {
  if (!usage) return;
  console.info(
    `AI usage: operation=${operation} model=${model} input=${usage.input_tokens} output=${usage.output_tokens} reasoning=${usage.output_tokens_details.reasoning_tokens}`,
  );
}

// store: false and safety_identifier are set here, so no caller can forget
// them: OpenAI keeps no response, and can trace abuse to one hashed user.
async function parseResponse<T>(request: StructuredRequest<T>) {
  try {
    return await getOpenAI().responses.parse(
      {
        model: request.model,
        instructions: request.instructions,
        input: request.input,
        reasoning: { effort: request.effort },
        text: {
          format: zodTextFormat(request.schema, request.schemaName),
          verbosity: request.verbosity,
        },
        max_output_tokens: request.maxOutputTokens,
        store: false,
        safety_identifier: sha256Hex(request.userId),
      },
      { timeout: request.timeoutMs },
    );
  } catch (error) {
    // The SDK parses the text with the schema, so a malformed answer throws
    // here, outside the SDK's own errors.
    if (error instanceof SyntaxError || error instanceof ZodError) {
      throw new AiOutputError("parse_failed", { cause: error });
    }
    throw error;
  }
}

// One answer in the shape of the schema. Throws AiOutputError when the model
// gives nothing usable, and the SDK's errors when the call itself fails.
export async function generateStructured<T>(
  request: StructuredRequest<T>,
): Promise<T> {
  const response = await parseResponse(request);
  logUsage(request.operation, request.model, response.usage);

  if (response.status === "incomplete") {
    throw new AiOutputError(
      toOutputReason(response.incomplete_details?.reason),
    );
  }
  const refused = response.output.some(
    (item) =>
      item.type === "message" &&
      item.content.some((part) => part.type === "refusal"),
  );
  if (refused) throw new AiOutputError("refusal");

  const parsed = response.output_parsed;
  if (parsed === null) throw new AiOutputError("empty");
  return parsed;
}

// The same privacy settings as parseResponse, as a stream of events.
function openStream(request: TextStreamRequest) {
  return getOpenAI().responses.stream(
    {
      model: request.model,
      instructions: request.instructions,
      input: request.input,
      reasoning: { effort: request.effort },
      text: { verbosity: request.verbosity },
      max_output_tokens: request.maxOutputTokens,
      store: false,
      safety_identifier: sha256Hex(request.userId),
    },
    { signal: request.signal, timeout: request.connectTimeoutMs },
  );
}

// The answer's text as it is written. Throws AiOutputError when the model
// stops short, fails, refuses or writes nothing, the SDK's errors when the
// call fails, and APIUserAbortError when `signal` aborts it.
export async function* streamText(
  request: TextStreamRequest,
): AsyncGenerator<string> {
  let wroteText = false;
  for await (const event of openStream(request)) {
    switch (event.type) {
      case "response.output_text.delta":
        wroteText = true;
        yield event.delta;
        break;
      case "response.refusal.delta":
        throw new AiOutputError("refusal");
      case "response.incomplete":
        logUsage(request.operation, request.model, event.response.usage);
        throw new AiOutputError(
          toOutputReason(event.response.incomplete_details?.reason),
        );
      case "response.failed":
      case "error":
        throw new AiOutputError("other");
      case "response.completed":
        logUsage(request.operation, request.model, event.response.usage);
        break;
    }
  }
  if (!wroteText) throw new AiOutputError("empty");
}

export function isAiSpendError(error: unknown): boolean {
  return (
    error instanceof RateLimitError &&
    (SPEND_ERROR_CODES.has(error.code ?? "") ||
      SPEND_ERROR_CODES.has(error.type ?? ""))
  );
}

// The order matters: a timeout is a connection error, a spend error a 429.
export function aiErrorKind(error: unknown): AiErrorKind | null {
  if (error instanceof AiOutputError) {
    return error.reason === "refusal" || error.reason === "content_filter"
      ? "refused"
      : "failed";
  }
  if (error instanceof APIConnectionTimeoutError) return "timeout";
  if (isAiSpendError(error)) return "unavailable";
  if (error instanceof RateLimitError) return "busy";
  if (
    error instanceof AuthenticationError ||
    error instanceof PermissionDeniedError
  ) {
    return "unavailable";
  }
  if (
    error instanceof InternalServerError ||
    error instanceof APIConnectionError
  ) {
    return "busy";
  }
  return null;
}

// One log line with the status and codes only: the message of an OpenAI error
// can quote the request, so it is left out.
export function aiErrorSummary(error: unknown): string {
  if (error instanceof AiOutputError) return `output=${error.reason}`;
  if (error instanceof APIError) {
    return `status=${error.status ?? "none"} code=${error.code ?? "none"} type=${error.type ?? "none"} request=${error.requestID ?? "none"}`;
  }
  if (error instanceof OpenAIError) return error.name;
  return error instanceof Error ? `${error.name}: ${error.message}` : "unknown";
}
