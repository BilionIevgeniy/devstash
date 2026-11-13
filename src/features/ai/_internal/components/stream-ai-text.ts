import "client-only";

import type { Failure } from "@/lib/action-result";
import { routeError } from "@/lib/route-error";

// A refusal or failure the route answered before any text, with its code.
// The route answers refusals as JSON; anything else (the platform's own error
// page, an empty body) is unavailable.
export class AiStreamRequestError extends Error {
  constructor(readonly failure: Failure) {
    super(failure.error);
  }
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
    throw new AiStreamRequestError(await routeError(response, "aiUnavailable"));
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
