import "server-only";

import {
  checkAiAccess,
  type AiRefusalReason,
} from "@/features/ai/_internal/services/access";
import { failedCall } from "@/features/ai/_internal/services/failed-call";
import {
  createStreamDeadlines,
  type StreamDeadlines,
} from "@/features/ai/_internal/services/stream-deadlines";
import { AI_FAILURE_MESSAGES } from "@/features/ai/domain/messages";
import { AI_MODEL, type AiStreamSettings } from "@/features/ai/domain/model";
import { STREAM_END_MARK } from "@/features/ai/domain/text-stream";
import { logger } from "@/lib/logger";
import { AiOutputError, streamText } from "@/lib/openai";

export type TextStreamStart =
  | { status: "refused"; reason: AiRefusalReason; error: string }
  | { status: "failed"; error: string }
  | { status: "aborted" }
  | { status: "ok"; stream: ReadableStream<Uint8Array> };

export interface TextStreamOperation {
  /** A short name for the usage logs, such as "explain". */
  operation: string;
  /** What the error logs call it, such as "Explaining code". */
  label: string;
  settings: AiStreamSettings;
  instructions: string;
  /** The item as the model reads it, already cut to the operation's limits. */
  input: string;
}

function openText(
  userId: string,
  request: TextStreamOperation,
  signal: AbortSignal,
) {
  const { settings } = request;
  return streamText({
    operation: request.operation,
    model: AI_MODEL,
    effort: settings.effort,
    verbosity: settings.verbosity,
    maxOutputTokens: settings.maxOutputTokens,
    connectTimeoutMs: settings.connectTimeoutMs,
    instructions: request.instructions,
    input: request.input,
    userId,
    signal,
  })[Symbol.asyncIterator]();
}

// A failure before any text: the route can still answer with a status.
async function failedBeforeText(
  error: unknown,
  deadlines: StreamDeadlines,
  label: string,
): Promise<TextStreamStart> {
  deadlines.clear();
  if (deadlines.clientGone()) return { status: "aborted" };
  if (deadlines.timedOut()) {
    await logger.error(`${label} timed out before any text`);
    return { status: "failed", error: AI_FAILURE_MESSAGES.timeout };
  }
  const { error: message } = await failedCall(error, label);
  return { status: "failed", error: message ?? AI_FAILURE_MESSAGES.failed };
}

// The rest of the answer as bytes. A failure now can only end the stream:
// the client sees a failed read and keeps the text it has. A finished answer
// ends with STREAM_END_MARK, so a stream cut anywhere else reads as cut.
function textStream(
  first: string,
  rest: AsyncIterator<string>,
  deadlines: StreamDeadlines,
  label: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first));
    },
    async pull(controller) {
      try {
        const next = await rest.next();
        if (next.done) {
          deadlines.clear();
          controller.enqueue(encoder.encode(STREAM_END_MARK));
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(next.value));
      } catch (error) {
        deadlines.clear();
        // Logged before the stream ends: once it has errored the response is
        // over, and a serverless instance can freeze with the event unsent.
        if (!deadlines.clientGone()) {
          await logger.error(`${label} stopped mid-answer`, { error });
        }
        controller.error(error);
      }
    },
    cancel() {
      deadlines.cancel();
    },
  });
}

// One streamed answer of any AI operation. Every refusal and every failure
// before the first words comes back as a status, because the headers are not
// sent yet. Nothing is written: the caller passes the item's text.
export async function startTextStream(
  userId: string,
  request: TextStreamOperation,
  clientSignal: AbortSignal,
): Promise<TextStreamStart> {
  const access = await checkAiAccess(userId);
  if (!access.success) {
    return { status: "refused", reason: access.reason, error: access.error };
  }

  const deadlines = createStreamDeadlines(clientSignal, request.settings);
  const text = openText(userId, request, deadlines.signal);
  try {
    const first = await text.next();
    if (first.done) throw new AiOutputError("empty");
    deadlines.textStarted();
    return {
      status: "ok",
      stream: textStream(first.value, text, deadlines, request.label),
    };
  } catch (error) {
    return failedBeforeText(error, deadlines, request.label);
  }
}
