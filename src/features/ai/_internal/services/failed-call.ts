import "server-only";

import { AI_FAILURE_MESSAGES } from "@/features/ai/domain/messages";
import { fail, type Failure } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { aiErrorKind, isAiSpendError } from "@/lib/openai";

// A failure of an OpenAI call that the user can act on, or wait out, is
// answered in its own words. Anything else (an Upstash outage, a bug) throws
// to the action. `operation` names the call in the log, never its content.
export async function failedCall(
  error: unknown,
  operation: string,
): Promise<Failure> {
  const kind = aiErrorKind(error);
  if (!kind) throw error;

  if (isAiSpendError(error)) {
    await logger.error(
      "OpenAI credit or spend limit reached; AI is off for everyone until it is raised",
      { error },
    );
  } else {
    await logger.error(`${operation} failed`, { error });
  }
  return fail(AI_FAILURE_MESSAGES[kind]);
}
