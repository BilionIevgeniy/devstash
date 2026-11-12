// The limits of GET /api/search (ADR 0018).

/** Longer text adds nothing: the query keeps at most 8 terms anyway. */
export const SEARCH_TEXT_MAX = 100;
/** The deepest page offered: 50 pages of 20, far past what a palette shows. */
export const SEARCH_OFFSET_MAX = 1_000;

// A typed search sends at most one request per pause of 250 ms, plus one per
// open and per "Show more": 120 a minute is far above real typing and stops a
// script reading the whole account through the route.
export const SEARCH_BY_USER_MINUTE = {
  name: "search:user-minute",
  limit: 120,
  windowSeconds: 60,
} as const;
