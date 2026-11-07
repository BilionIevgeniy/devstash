import { streamAiAnswer } from "@/app/api/ai/_shared/stream-answer";
import { optimizePromptInputSchema } from "@/features/ai/schemas";
import { startPromptOptimization } from "@/features/ai/services/prompt-optimizer";

// The service gives up at 50 s, so a slow answer ends in its own words and
// not in the platform's error page.
export const maxDuration = 60;

export function POST(request: Request) {
  return streamAiAnswer(
    request,
    optimizePromptInputSchema,
    startPromptOptimization,
    "Optimizing a prompt",
  );
}
