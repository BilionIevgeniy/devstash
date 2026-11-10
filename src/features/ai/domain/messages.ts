export const AI_PRO_ONLY_MESSAGE = "AI features require a Pro subscription";
// Shown next to every AI button that makes a call (not the Free upgrade link),
// and repeated in the privacy notice.
export const AI_DATA_NOTICE = "Content is sent to OpenAI when you click.";
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

// Prompt optimization: the view's notes, and why Accept is not offered.
export const AI_OPTIMIZE_CUT_SHORT_MESSAGE =
  "The optimized prompt was cut short. Try again.";
export const AI_OPTIMIZE_IMAGE_MESSAGE =
  "The optimized prompt contains an image, so it cannot be used as is. Copy it instead.";
export const AI_OPTIMIZE_UNCHANGED_MESSAGE =
  "The prompt is already in good shape: nothing to change.";
export const AI_OPTIMIZE_PROMPT_CUT_MESSAGE =
  "Only the start of this long prompt was read, so the result cannot replace it. Copy what you need.";
