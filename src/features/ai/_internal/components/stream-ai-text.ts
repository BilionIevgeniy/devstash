import "client-only";

import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";
import { routeErrorMessage } from "@/lib/route-error";

// A refusal or failure the route answered before any text, in its own words.
export class AiStreamRequestError extends Error {}

// The route answers refusals as JSON; anything else (the platform's own error
// page, an empty body) is shown as unavailable.
function errorMessage(response: Response): Promise<string> {
  return routeErrorMessage(response, AI_UNAVAILABLE_MESSAGE);
}

// The browser side of a streaming AI route: calls onText with each piece of
// the answer as it arrives. Throws AiStreamRequestError for an answer refused
// before the text, the reader's error for a stream that broke, and an
// AbortError once `signal` aborts.
export async function streamAiText(
  url: string,
  body: unknown,
  signal: AbortSignal,
  onText: (text: string) => void,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new AiStreamRequestError(await errorMessage(response));
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onText(decoder.decode(value, { stream: true }));
  }
  // A character split across the last two reads.
  const tail = decoder.decode();
  if (tail) onText(tail);
}
