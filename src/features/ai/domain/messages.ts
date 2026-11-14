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
