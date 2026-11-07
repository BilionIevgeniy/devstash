import "server-only";

import { checkAiAccess } from "@/features/ai/_internal/services/access";
import { failedCall } from "@/features/ai/_internal/services/failed-call";
import {
  AUTO_TAG_CONTENT_MAX,
  AUTO_TAG_TITLE_MAX,
  itemInput,
  truncateForModel,
} from "@/features/ai/domain/input";
import { AI_MODEL, AUTO_TAG_SETTINGS } from "@/features/ai/domain/model";
import {
  AUTO_TAG_INSTRUCTIONS,
  normalizeTags,
} from "@/features/ai/domain/tags";
import { tagSuggestionsSchema, type AiItemInput } from "@/features/ai/schemas";
import type { OperationResult } from "@/lib/action-result";
import { generateStructured } from "@/lib/openai";

export interface SuggestTagsResult extends OperationResult {
  data: string[] | null;
}

// Up to five tags for the title and the start of the content. The caller
// passes the text; this feature never reads items. Nothing is written.
export async function suggestTags(
  userId: string,
  { title, content }: AiItemInput,
): Promise<SuggestTagsResult> {
  const access = await checkAiAccess(userId);
  if (!access.success) return { ...access, data: null };

  try {
    const output = await generateStructured({
      operation: "auto-tags",
      model: AI_MODEL,
      ...AUTO_TAG_SETTINGS,
      instructions: AUTO_TAG_INSTRUCTIONS,
      input: itemInput(
        truncateForModel(title, AUTO_TAG_TITLE_MAX),
        truncateForModel(content, AUTO_TAG_CONTENT_MAX),
      ),
      schema: tagSuggestionsSchema,
      schemaName: "tag_suggestions",
      userId,
    });
    return { success: true, error: null, data: normalizeTags(output.tags) };
  } catch (error) {
    return failedCall(error, "Suggesting tags");
  }
}
