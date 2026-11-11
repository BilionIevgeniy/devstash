import "server-only";

import { AI_FAILURE_MESSAGES } from "@/features/ai/domain/messages";
import type { OperationResult } from "@/lib/action-result";
import { logger } from "@/lib/logger";
import { aiErrorKind, isAiSpendError } from "@/lib/openai";

export interface FailedAiCall extends OperationResult {
  data: null;
}

// A failure of an OpenAI call that the user can act on, or wait out, is
// answered in its own words. Anything else (an Upstash outage, a bug) throws
// to the action. `operation` names the call in the log, never its content.
export async function failedCall(
  error: unknown,
  operation: string,
): Promise<FailedAiCall> {
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
  return { success: false, error: AI_FAILURE_MESSAGES[kind], data: null };
}
