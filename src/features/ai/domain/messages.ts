export const AI_PRO_ONLY_MESSAGE = "AI features require a Pro subscription";
export const AI_DAILY_LIMIT_MESSAGE =
  "Daily AI limit reached. Try again tomorrow.";
export const AI_APP_LIMIT_MESSAGE =
  "AI has reached its daily limit. Try again tomorrow.";
export const AI_UNAVAILABLE_MESSAGE = "AI is unavailable right now.";

/** The same names as the kinds `lib/openai` gives a failed call. */
export type AiFailureKind =
  "busy" | "unavailable" | "timeout" | "refused" | "failed";

export const AI_FAILURE_MESSAGES: Record<AiFailureKind, string> = {
  busy: "AI is busy. Try again in a moment.",
  unavailable: AI_UNAVAILABLE_MESSAGE,
  timeout: "That took too long. Try again.",
  refused: "AI could not answer this item.",
  failed: "AI could not finish the answer. Try again.",
};

// Explain Code: the route's answers before the stream, and the view's notes.
export const AI_SIGNED_OUT_MESSAGE = "Your session ended. Sign in again.";
export const AI_EXPLAIN_CUT_SHORT_MESSAGE =
  "The explanation was cut short. Try again.";
