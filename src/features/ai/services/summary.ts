import "server-only";

import { checkAiAccess } from "@/features/ai/_internal/services/access";
import { failedCall } from "@/features/ai/_internal/services/failed-call";
import {
  itemInput,
  SUMMARY_CONTENT_MAX,
  SUMMARY_TITLE_MAX,
  truncateForModel,
} from "@/features/ai/domain/input";
import { AI_FAILURE_CODES } from "@/features/ai/domain/messages";
import { AI_MODEL, SUMMARY_SETTINGS } from "@/features/ai/domain/model";
import {
  normalizeSummary,
  SUMMARY_INSTRUCTIONS,
} from "@/features/ai/domain/summary";
import { summarySchema, type AiItemInput } from "@/features/ai/schemas";
import { fail, failFrom, ok, type OperationResult } from "@/lib/action-result";
import { generateStructured } from "@/lib/openai";

export type SummarizeItemResult = OperationResult<string>;

// A description of one or two sentences for the title and the content. The
// caller passes the text; this feature never reads items. Nothing is written.
export async function summarizeItem(
  userId: string,
  { title, content }: AiItemInput,
): Promise<SummarizeItemResult> {
  const access = await checkAiAccess(userId);
  if (!access.success) return failFrom(access);

  try {
    const output = await generateStructured({
      operation: "summary",
      model: AI_MODEL,
      ...SUMMARY_SETTINGS,
      instructions: SUMMARY_INSTRUCTIONS,
      input: itemInput(
        truncateForModel(title, SUMMARY_TITLE_MAX),
        truncateForModel(content, SUMMARY_CONTENT_MAX),
      ),
      schema: summarySchema,
      schemaName: "item_summary",
      userId,
    });
    const summary = normalizeSummary(output.summary);
    if (summary === "") {
      return fail(AI_FAILURE_CODES.failed);
    }
    return ok(summary);
  } catch (error) {
    return failedCall(error, "Summarizing an item");
  }
}
