const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

// Shared by every AI feature. The hourly limit alone would allow a month of
// calls costing about as much as the Pro plan; the daily one caps it
// (docs/ai-integration-plan.md §7).
export const AI_BY_USER_HOUR = {
  name: "ai:user-hour",
  limit: 20,
  windowSeconds: HOUR_SECONDS,
} as const;

export const AI_BY_USER_DAY = {
  name: "ai:user-day",
  limit: 100,
  windowSeconds: DAY_SECONDS,
} as const;

// One counter for the whole app, keyed by AI_APP_LIMIT_KEY. The per-user limits
// do not bound the bill when anyone can reach Pro (a test-mode checkout, many
// accounts): this one does, at about $0.10 a day of tags.
export const AI_APP_LIMIT_KEY = "app";

export const AI_BY_APP_DAY = {
  name: "ai:app-day",
  limit: 1_000,
  windowSeconds: DAY_SECONDS,
} as const;
