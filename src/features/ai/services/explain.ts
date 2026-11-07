import "server-only";

import {
  EXPLAIN_INSTRUCTIONS,
  explainInput,
} from "@/features/ai/domain/explain";
import {
  EXPLAIN_CODE_MAX,
  EXPLAIN_TITLE_MAX,
  truncateForModel,
} from "@/features/ai/domain/input";
import { EXPLAIN_SETTINGS } from "@/features/ai/domain/model";
import type { ExplainInput } from "@/features/ai/schemas";
import {
  startTextStream,
  type TextStreamStart,
} from "@/features/ai/services/text-stream";
import { languageLabel } from "@/features/editor/domain/code-language";

// The explanation of the code the caller passes: this feature never reads items.
export function startExplanation(
  userId: string,
  input: ExplainInput,
  clientSignal: AbortSignal,
): Promise<TextStreamStart> {
  return startTextStream(
    userId,
    {
      operation: "explain",
      label: "Explaining code",
      settings: EXPLAIN_SETTINGS,
      instructions: EXPLAIN_INSTRUCTIONS,
      input: explainInput(
        truncateForModel(input.title, EXPLAIN_TITLE_MAX),
        input.language ? languageLabel(input.language) : null,
        truncateForModel(input.code, EXPLAIN_CODE_MAX),
      ),
    },
    clientSignal,
  );
}
