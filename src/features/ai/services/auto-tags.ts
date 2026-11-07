import "server-only";

import { checkAiAccess } from "@/features/ai/_internal/services/access";
import {
  AUTO_TAG_CONTENT_MAX,
  AUTO_TAG_TITLE_MAX,
  truncateForModel,
} from "@/features/ai/domain/input";
import { AI_FAILURE_MESSAGES } from "@/features/ai/domain/messages";
import { AI_MODEL, AUTO_TAG_SETTINGS } from "@/features/ai/domain/model";
import {
  AUTO_TAG_INSTRUCTIONS,
  autoTagInput,
  normalizeTags,
} from "@/features/ai/domain/tags";
import {
  tagSuggestionsSchema,
  type AutoTagsInput,
} from "@/features/ai/schemas";
import type { OperationResult } from "@/lib/action-result";
import {
  aiErrorKind,
  aiErrorSummary,
  generateStructured,
  isAiSpendError,
} from "@/lib/openai";

export interface SuggestTagsResult extends OperationResult {
  data: string[] | null;
}

// A failure the user can act on, or wait out, is answered in its own words.
// Anything else (an Upstash outage, a bug) throws to the action.
function failedCall(error: unknown): SuggestTagsResult {
  const kind = aiErrorKind(error);
  if (!kind) throw error;

  if (isAiSpendError(error)) {
    console.error(
      "OpenAI credit or spend limit reached; AI is off for everyone until it is raised:",
      aiErrorSummary(error),
    );
  } else {
    console.error("Suggesting tags failed:", aiErrorSummary(error));
  }
  return { success: false, error: AI_FAILURE_MESSAGES[kind], data: null };
}

// Up to five tags for the title and the start of the content. The caller
// passes the text; this feature never reads items. Nothing is written.
export async function suggestTags(
  userId: string,
  { title, content }: AutoTagsInput,
): Promise<SuggestTagsResult> {
  const access = await checkAiAccess(userId);
  if (!access.success) return { ...access, data: null };

  try {
    const output = await generateStructured({
      operation: "auto-tags",
      model: AI_MODEL,
      ...AUTO_TAG_SETTINGS,
      instructions: AUTO_TAG_INSTRUCTIONS,
      input: autoTagInput(
        truncateForModel(title, AUTO_TAG_TITLE_MAX),
        truncateForModel(content, AUTO_TAG_CONTENT_MAX),
      ),
      schema: tagSuggestionsSchema,
      schemaName: "tag_suggestions",
      userId,
    });
    return { success: true, error: null, data: normalizeTags(output.tags) };
  } catch (error) {
    return failedCall(error);
  }
}
