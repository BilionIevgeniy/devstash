import { streamAiAnswer } from "@/app/api/ai/_shared/stream-answer";
import { explainInputSchema } from "@/features/ai/schemas";
import { startExplanation } from "@/features/ai/services/explain";

// The service gives up at 50 s, so a slow answer ends in its own words and
// not in the platform's error page.
export const maxDuration = 60;

export function POST(request: Request) {
  return streamAiAnswer(
    request,
    explainInputSchema,
    startExplanation,
    "Explaining code",
  );
}
