// The text side of search in Postgres (ADR 0018). The migration search_vectors
// builds each tsvector from text with every run of characters that are not a
// letter or a digit replaced by a space, so "console.log" is stored as
// "console" and "log". The query side splits the same way here.

const NOT_A_WORD_CHARACTER = /[^\p{L}\p{N}]+/u;

/** Terms shorter than this are dropped: "a:*" would match half the index. */
export const SEARCH_TERM_MIN = 2;
/** Further terms are ignored; each one narrows the match anyway. */
export const SEARCH_TERMS_MAX = 8;
/** The typo match (pg_trgm on titles and names) needs at least this many. */
export const TYPO_MATCH_MIN = 3;
/** One page of item results in the palette. */
export const SEARCH_PAGE_SIZE = 20;
/** Collections are shown only with the first page of items. */
export const COLLECTION_RESULTS_MAX = 5;

function toTerms(text: string): string[] {
  return text
    .split(NOT_A_WORD_CHARACTER)
    .filter((term) => term.length >= SEARCH_TERM_MIN)
    .slice(0, SEARCH_TERMS_MAX);
}

// Every term as a prefix, all of them required: "use eff" finds "useEffect"
// only if it is a word of its own, and "react hook" finds an item tagged react
// with "hook" in its title. Only letters and digits reach to_tsquery, so no
// operator typed by the user can change the query. null: nothing to match.
export function toPrefixTsQuery(text: string): string | null {
  const terms = toTerms(text);
  if (terms.length === 0) return null;
  return terms.map((term) => `${term}:*`).join(" & ");
}

// The text for the trigram match: its words joined by spaces, or null when
// they hold too few letters and digits to be useful (pg_trgm ignores the rest).
export function toTypoMatchText(text: string): string | null {
  const words = text.split(NOT_A_WORD_CHARACTER).filter(Boolean);
  const letters = words.reduce((sum, word) => sum + Array.from(word).length, 0);
  return letters >= TYPO_MATCH_MIN ? words.join(" ") : null;
}

export interface SearchMatch {
  /** The prefix tsquery, or null when no term is long enough. */
  tsQuery: string | null;
  /** The text for the typo match, or null when it is too short. */
  typoText: string | null;
}

// Both sides of a search, or null when the text can match nothing: the caller
// answers that without a query (and the palette without a request).
export function toSearchMatch(text: string): SearchMatch | null {
  const match = {
    tsQuery: toPrefixTsQuery(text),
    typoText: toTypoMatchText(text),
  };
  return match.tsQuery === null && match.typoText === null ? null : match;
}

// Item.searchTags: the tag names sorted and joined by spaces. The migration
// backfilled it the same way; every write of ItemTag sets it in the same write.
export function toSearchTags(names: readonly string[]): string {
  return [...new Set(names)].toSorted().join(" ");
}
