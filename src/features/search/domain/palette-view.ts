import type { PaletteResults } from "@/features/search/types";

type PaletteOutcome =
  | { status: "ready"; results: PaletteResults }
  | { status: "error" }
  | { status: "rate-limited" };

interface PaletteState {
  /** The answer for the current text, or null while none has arrived. */
  outcome: PaletteOutcome | null;
  /** The results to keep on screen while the answer for the text is pending. */
  previous: PaletteResults | null;
  isPending: boolean;
}

export interface PaletteView {
  /** The skeleton: nothing to show yet. */
  isLoading: boolean;
  /** A failed answer, said in words with a way to retry. */
  failure: "error" | "rate-limited" | null;
  /** The rows of the list: the answer, or the previous one while pending. */
  results: PaletteResults | null;
  /** The answer came and matched nothing. */
  isEmpty: boolean;
}

// What the command palette shows for the state of its search. While an
// answer is pending the previous results stay (the component disables them),
// or the skeleton shows when there are none.
export function paletteView({
  outcome,
  previous,
  isPending,
}: PaletteState): PaletteView {
  if (isPending) {
    return {
      isLoading: previous === null,
      failure: null,
      results: previous,
      isEmpty: false,
    };
  }
  if (outcome === null) {
    return { isLoading: true, failure: null, results: null, isEmpty: false };
  }
  if (outcome.status !== "ready") {
    return {
      isLoading: false,
      failure: outcome.status,
      results: null,
      isEmpty: false,
    };
  }
  const { results } = outcome;
  const isEmpty =
    results.items.length === 0 && results.collections.length === 0;
  return { isLoading: false, failure: null, results, isEmpty };
}
