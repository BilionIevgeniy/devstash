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
import {
  EXPLAIN_INSTRUCTIONS,
  explainInput,
  STREAM_END_MARK,
} from "@/features/ai/domain/explain";
import {
  EXPLAIN_CODE_MAX,
  EXPLAIN_TITLE_MAX,
  truncateForModel,
} from "@/features/ai/domain/input";
import { AI_FAILURE_MESSAGES } from "@/features/ai/domain/messages";
import { AI_MODEL, EXPLAIN_SETTINGS } from "@/features/ai/domain/model";
import type { ExplainInput } from "@/features/ai/schemas";
import { languageLabel } from "@/features/editor/domain/code-language";
import { aiErrorSummary, AiOutputError, streamText } from "@/lib/openai";

export type ExplanationStart =
  | { status: "refused"; reason: AiRefusalReason; error: string }
  | { status: "failed"; error: string }
  | { status: "aborted" }
  | { status: "ok"; stream: ReadableStream<Uint8Array> };

const OPERATION = "Explaining code";

function openText(userId: string, input: ExplainInput, signal: AbortSignal) {
  return streamText({
    operation: "explain",
    model: AI_MODEL,
    effort: EXPLAIN_SETTINGS.effort,
    verbosity: EXPLAIN_SETTINGS.verbosity,
    maxOutputTokens: EXPLAIN_SETTINGS.maxOutputTokens,
    connectTimeoutMs: EXPLAIN_SETTINGS.connectTimeoutMs,
    instructions: EXPLAIN_INSTRUCTIONS,
    input: explainInput(
      truncateForModel(input.title, EXPLAIN_TITLE_MAX),
      input.language ? languageLabel(input.language) : null,
      truncateForModel(input.code, EXPLAIN_CODE_MAX),
    ),
    userId,
    signal,
  })[Symbol.asyncIterator]();
}

// A failure before any text: the route can still answer with a status.
function failedBeforeText(
  error: unknown,
  deadlines: StreamDeadlines,
): ExplanationStart {
  deadlines.clear();
  if (deadlines.clientGone()) return { status: "aborted" };
  if (deadlines.timedOut()) {
    console.error(`${OPERATION} timed out before any text`);
    return { status: "failed", error: AI_FAILURE_MESSAGES.timeout };
  }
  const { error: message } = failedCall(error, OPERATION);
  return { status: "failed", error: message ?? AI_FAILURE_MESSAGES.failed };
}

// The rest of the answer as bytes. A failure now can only end the stream:
// the client sees a failed read and keeps the text it has. A finished answer
// ends with STREAM_END_MARK, so a stream cut anywhere else reads as cut.
function textStream(
  first: string,
  rest: AsyncIterator<string>,
  deadlines: StreamDeadlines,
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
        if (!deadlines.clientGone()) {
          console.error(
            `${OPERATION} stopped mid-answer:`,
            aiErrorSummary(error),
          );
        }
        controller.error(error);
      }
    },
    cancel() {
      deadlines.cancel();
    },
  });
}

// Every refusal and every failure before the first words comes back as a
// status, because the headers are not sent yet. Nothing is written, and the
// caller passes the code: this feature never reads items.
export async function startExplanation(
  userId: string,
  input: ExplainInput,
  clientSignal: AbortSignal,
): Promise<ExplanationStart> {
  const access = await checkAiAccess(userId);
  if (!access.success) {
    return { status: "refused", reason: access.reason, error: access.error };
  }

  const deadlines = createStreamDeadlines(clientSignal, EXPLAIN_SETTINGS);
  const text = openText(userId, input, deadlines.signal);
  try {
    const first = await text.next();
    if (first.done) throw new AiOutputError("empty");
    deadlines.textStarted();
    return { status: "ok", stream: textStream(first.value, text, deadlines) };
  } catch (error) {
    return failedBeforeText(error, deadlines);
  }
}
