// The one place the model is named, so the next deprecation is a one-line
// change. Shutdown dates are listed by GET /v1/models (`shutdown_date`).
export const AI_MODEL = "gpt-6-luna";

export interface AiOperationSettings {
  effort: "none" | "low";
  verbosity: "low" | "medium";
  /** Includes reasoning tokens: a limit set too low bills and shows nothing. */
  maxOutputTokens: number;
  /** Per attempt. Server Actions run one at a time, so a slow call holds up the user's Save. */
  timeoutMs: number;
}

// Starting points, to be set from the usage logs (docs/ai-integration-plan.md §4).
export const AUTO_TAG_SETTINGS: AiOperationSettings = {
  effort: "none",
  verbosity: "low",
  maxOutputTokens: 300,
  timeoutMs: 10_000,
};
