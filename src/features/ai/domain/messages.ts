// Shown next to every AI button that makes a call (not the Free upgrade link),
// and repeated in the privacy notice.
export const AI_DATA_NOTICE = "Content is sent to OpenAI when you click.";

/** The same names as the kinds `lib/openai` gives a failed call. */
export type AiFailureKind =
  "busy" | "unavailable" | "timeout" | "refused" | "failed";

// The error code of each kind; the words are in the errors messages.
export const AI_FAILURE_CODES = {
  busy: "aiBusy",
  unavailable: "aiUnavailable",
  timeout: "aiTimeout",
  refused: "aiRefused",
  failed: "aiFailed",
} as const satisfies Record<AiFailureKind, string>;

// Explain Code: the view's notes.
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
