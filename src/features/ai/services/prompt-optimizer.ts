import "server-only";

import {
  PROMPT_OPTIMIZE_CONTENT_MAX,
  PROMPT_OPTIMIZE_TITLE_MAX,
  truncateForModel,
} from "@/features/ai/domain/input";
import { PROMPT_OPTIMIZE_SETTINGS } from "@/features/ai/domain/model";
import {
  PROMPT_OPTIMIZE_INSTRUCTIONS,
  promptOptimizeInput,
} from "@/features/ai/domain/prompt-optimizer";
import type { OptimizePromptInput } from "@/features/ai/schemas";
import {
  startTextStream,
  type TextStreamStart,
} from "@/features/ai/services/text-stream";

// The improved version of the prompt the caller passes. Nothing is written:
// accepting it is a save of `items`, after the user has read it.
export function startPromptOptimization(
  userId: string,
  input: OptimizePromptInput,
  clientSignal: AbortSignal,
): Promise<TextStreamStart> {
  return startTextStream(
    userId,
    {
      operation: "optimize-prompt",
      label: "Optimizing a prompt",
      settings: PROMPT_OPTIMIZE_SETTINGS,
      instructions: PROMPT_OPTIMIZE_INSTRUCTIONS,
      input: promptOptimizeInput(
        truncateForModel(input.title, PROMPT_OPTIMIZE_TITLE_MAX),
        truncateForModel(input.prompt, PROMPT_OPTIMIZE_CONTENT_MAX),
      ),
    },
    clientSignal,
  );
}
