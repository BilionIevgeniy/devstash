import "client-only";

import { AI_UNAVAILABLE_MESSAGE } from "@/features/ai/domain/messages";
import type { ExplainInput } from "@/features/ai/schemas";

const EXPLAIN_URL = "/api/ai/explain";

// A refusal or failure the route answered before any text, in its own words.
export class ExplainRequestError extends Error {}

// The route answers refusals as JSON; anything else (the platform's own error
// page, an empty body) is shown as unavailable.
async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Not JSON: fall through.
  }
  return AI_UNAVAILABLE_MESSAGE;
}

// Calls onText with each piece of the answer as it arrives. Throws
// ExplainRequestError for an answer refused before the text, the reader's
// error for a stream that broke, and an AbortError once `signal` aborts.
export async function streamExplanation(
  input: ExplainInput,
  signal: AbortSignal,
  onText: (text: string) => void,
): Promise<void> {
  const response = await fetch(EXPLAIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new ExplainRequestError(await errorMessage(response));
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
